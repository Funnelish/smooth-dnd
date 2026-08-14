import { extraSizeForInsertion, translationValue, visibilityValue } from './constants';
import { Dictionary, ElementX, OffsetSize, Orientation, Position, Rect, LayoutManager } from './interfaces';
import * as Utils from './utils';

export interface PropMap {
	[key: string]: any;
}

const horizontalMap: PropMap = {
	size: 'offsetWidth',
	distanceToParent: 'offsetLeft',
	translate: 'transform',
	begin: 'left',
	end: 'right',
	dragPosition: 'x',
	scrollSize: 'scrollWidth',
	offsetSize: 'offsetWidth',
	scrollValue: 'scrollLeft',
	scale: 'scaleX',
	setSize: 'width',
	setters: {
		'translate': (val: number) => `translate3d(${val}px, 0, 0)`
	}
};

const verticalMap: PropMap = {
	size: 'offsetHeight',
	distanceToParent: 'offsetTop',
	translate: 'transform',
	begin: 'top',
	end: 'bottom',
	dragPosition: 'y',
	scrollSize: 'scrollHeight',
	offsetSize: 'offsetHeight',
	scrollValue: 'scrollTop',
	scale: 'scaleY',
	setSize: 'height',
	setters: {
		'translate': (val: string) => `translate3d(0,${val}px, 0)`
	}
};

function orientationDependentProps(map: PropMap) {
	function get(obj: Dictionary, prop: string) {
		const mappedProp = map[prop];
		return obj[mappedProp || prop];
	}

	function set(obj: Dictionary, prop: string, value: any) {
		obj[map[prop]] = map.setters[prop] ? map.setters[prop](value) : value;
	}

	return { get, set };
}



export default function layoutManager(containerElement: ElementX, orientation: Orientation, _animationDuration: number): LayoutManager {
	containerElement[extraSizeForInsertion] = 0;
	const map = orientation === 'horizontal' ? horizontalMap : verticalMap;
	const propMapper = orientationDependentProps(map);
	const values: Dictionary = {
		translation: 0
	};

	window.addEventListener('resize', function () {
		invalidateContainerRectangles(containerElement);
	});

	setTimeout(() => {
		invalidate();
	}, 10);

	function invalidate() {
		invalidateContainerRectangles(containerElement);
		invalidateContainerScale(containerElement);
	}

	function invalidateContainerRectangles(containerElement: ElementX) {
		values.rect = Utils.getContainerRect(containerElement);
		const visibleRect = Utils.getVisibleRect(containerElement, values.rect);
		if (Utils.isVisible(visibleRect)) {
			values.lastVisibleRect = values.visibleRect;
		}

		values.visibleRect = visibleRect;
	}

	function invalidateContainerScale(containerElement: ElementX) {
		const scale = Utils.getElementScale(containerElement);
		values.scaleX = scale.x;
		values.scaleY = scale.y;
	}

	function getScale() {
		return propMapper.get(values, 'scale') || 1;
	}

	function toLocalPixels(renderedPixels: number) {
		return renderedPixels / getScale();
	}

	function parsePixelValue(value: string) {
		const parsed = parseFloat(value);
		if (Number.isNaN(parsed)) {
			return null;
		}

		return parsed;
	}

	function getContainerRectangles() {
		return {
			rect: values.rect,
			visibleRect: values.visibleRect,
			lastVisibleRect: values.lastVisibleRect
		};
	}

	function getBeginEndOfDOMRect(rect: Rect) {
		return {
			begin: propMapper.get(rect, 'begin'),
			end: propMapper.get(rect, 'end')
		};
	}

	function getBeginEndOfContainer() {
		const begin = propMapper.get(values.rect, 'begin') + values.translation;
		const end = propMapper.get(values.rect, 'end') + values.translation;
		return { begin, end };
	}

	function getBeginEndOfContainerVisibleRect() {
		const begin = propMapper.get(values.visibleRect, 'begin') + values.translation;
		const end = propMapper.get(values.visibleRect, 'end') + values.translation;
		return { begin, end };
	}

	function getSize(element: HTMLElement | OffsetSize) {
		const htmlElement = element as HTMLElement;
		if (htmlElement.tagName) {
			return propMapper.get(htmlElement, 'offsetSize') * getScale();
		}

		return propMapper.get(element, 'size');
	}

	function getDistanceToOffsetParent(element: ElementX) {
		return propMapper.get(element, 'distanceToParent') * getScale() + (element[translationValue] || 0);
	}

	function getBeginEnd(element: HTMLElement) {
		const begin = getDistanceToOffsetParent(element as ElementX) +
			(propMapper.get(values.rect, 'begin') + values.translation) -
			getScrollValue(containerElement);
		return {
			begin,
			end: begin + getSize(element)
		};
	}

	function setSize(element: HTMLElement | CSSStyleDeclaration, size: string) {
		const parsedSize = parsePixelValue(size);
		if (parsedSize === null || size.indexOf('px') === -1) {
			propMapper.set(element, 'setSize', size);
			return;
		}

		propMapper.set(element, 'setSize', `${toLocalPixels(parsedSize)}px`);
	}

	function getAxisValue(position: Position) {
		return propMapper.get(position, 'dragPosition');
	}

	function setTranslation(element: ElementX, translation: number) {
		if (!translation) {
			element.style.removeProperty('transform');
		} else {
			propMapper.set(element.style, 'translate', toLocalPixels(translation));
		}
		element[translationValue] = translation;
	}

	function getTranslation(element: ElementX) {
		return element[translationValue];
	}

	function setVisibility(element: ElementX, isVisible: boolean) {
		if (element[visibilityValue] === undefined || element[visibilityValue] !== isVisible) {
			if (isVisible) {
				element.style.removeProperty('visibility');
			} else {
				element.style.visibility = 'hidden';
			}
			element[visibilityValue] = isVisible;
		}
	}

	function isVisible(element: ElementX) {
		return element[visibilityValue] === undefined || element[visibilityValue];
	}

	function isInVisibleRect(x: number, y: number) {
		let { left, top, right, bottom } = values.visibleRect;

		// if there is no wrapper in rect size will be 0 and wont accept any drop
		// so make sure at least there is 30px difference
		if (bottom - top < 2) {
			bottom = top + 30;
		}
		const containerRect = values.rect;
		if (orientation === 'vertical') {
			return x > containerRect.left && x < containerRect.right && y > top && y < bottom;
		} else {
			return x > left && x < right && y > containerRect.top && y < containerRect.bottom;
		}
	}

	function getTopLeftOfElementBegin(begin: number) {
		let top = 0;
		let left = 0;
		if (orientation === 'horizontal') {
			left = begin;
			top = values.rect.top;
		} else {
			left = values.rect.left;
			top = begin;
		}

		return {
			top, left
		};
	}

	function getScrollSize(element: HTMLElement) {
		return propMapper.get(element, 'scrollSize') * getScale();
	}

	function getScrollValue(element: HTMLElement) {
		return propMapper.get(element, 'scrollValue') * getScale();
	}

	function setScrollValue(element: HTMLElement, val: number) {
		return propMapper.set(element, 'scrollValue', toLocalPixels(val));
	}

	function getPosition(position: Position) {
		return getAxisValue(position);
	}

	function invalidateRects() {
		invalidateContainerRectangles(containerElement);
	}

	function setBegin(style: CSSStyleDeclaration, value: string) {
		const parsedValue = parsePixelValue(value);
		if (parsedValue === null || value.indexOf('px') === -1) {
			propMapper.set(style, 'begin', value);
			return;
		}

		propMapper.set(style, 'begin', `${toLocalPixels(parsedValue)}px`);
	}

	return {
		getSize,
		getContainerRectangles,
		getBeginEndOfDOMRect,
		getBeginEndOfContainer,
		getBeginEndOfContainerVisibleRect,
		getBeginEnd,
		getAxisValue,
		setTranslation,
		getTranslation,
		setVisibility,
		isVisible,
		isInVisibleRect,
		setSize,
		getTopLeftOfElementBegin,
		getScrollSize,
		getScrollValue,
		setScrollValue,
		invalidate,
		invalidateRects,
		getPosition,
		setBegin,
	};
}
