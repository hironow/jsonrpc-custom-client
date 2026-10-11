import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import {
	Virtualizer,
	elementScroll,
	observeElementOffset,
	observeElementRect,
	type VirtualItem,
} from "@tanstack/react-virtual";

type RowSnapshot = { items: VirtualItem[]; totalSize: number };
const emptySnapshot: RowSnapshot = { items: [], totalSize: 0 };

// Publish values from the mutable virtualizer through React's external-store contract.
export function useMessageRows(options: {
	count: number;
	getScrollElement: () => HTMLDivElement | null;
	estimateSize: (index: number) => number;
}) {
	const [store] = useState(() => {
		const listeners = new Set<() => void>();
		let snapshot = emptySnapshot;
		let previousItems: VirtualItem[] | undefined;
		const publish = (instance: Virtualizer<HTMLDivElement, HTMLDivElement>) => {
			const items = instance.getVirtualItems();
			const totalSize = instance.getTotalSize();
			if (items === previousItems && totalSize === snapshot.totalSize) return;
			previousItems = items;
			snapshot = { items: items.map((item) => ({ ...item })), totalSize };
			for (const listener of listeners) listener();
		};
		const instance = new Virtualizer<HTMLDivElement, HTMLDivElement>({
			...options,
			overscan: 10,
			scrollToFn: elementScroll,
			observeElementOffset,
			observeElementRect,
			onChange: publish,
		});
		return {
			instance,
			publish: () => publish(instance),
			getSnapshot: () => snapshot,
			subscribe(listener: () => void) {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			},
		};
	});
	useLayoutEffect(() => store.instance._didMount(), [store]);
	useLayoutEffect(() => {
		store.instance.setOptions({ ...store.instance.options, ...options });
		store.instance._willUpdate();
		store.publish();
	});
	const snapshot = useSyncExternalStore(
		store.subscribe,
		store.getSnapshot,
		() => emptySnapshot,
	);
	return { ...snapshot, measureElement: store.instance.measureElement };
}
