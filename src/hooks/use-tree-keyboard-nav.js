import { useRef } from "react";

/**
 * Keyboard navigation for a list or tree of rows.
 *
 * Rows opt in by carrying a data-tree-item attribute, and must be focusable
 * in their own right (a button or a link) so that Tab reaches them too. The
 * rendered order of those rows is taken to be the visible order.
 *
 * Rows that expand also carry data-expanded ("true" or "false") and
 * data-level (1 based depth), which is what lets ArrowRight and ArrowLeft
 * open, close and step back out to the parent. A flat list can leave both
 * off and still get ArrowUp, ArrowDown, Home and End.
 *
 * Returns the ref and the handler to put on the container element.
 */
export function useTreeKeyboardNav() {
    const ref = useRef(null);

    const onKeyDown = (e) => {
        const keys = [
            "ArrowDown",
            "ArrowUp",
            "ArrowRight",
            "ArrowLeft",
            "Home",
            "End",
        ];
        if (!keys.includes(e.key)) return;

        const items = Array.from(
            ref.current?.querySelectorAll("[data-tree-item]") ?? [],
        );
        const index = items.indexOf(document.activeElement);
        if (index === -1) return;

        const focus = (item) => {
            if (!item) return;
            e.preventDefault();
            item.focus();
        };

        if (e.key === "ArrowDown") return focus(items[index + 1]);
        if (e.key === "ArrowUp") return focus(items[index - 1]);
        if (e.key === "Home") return focus(items[0]);
        if (e.key === "End") return focus(items[items.length - 1]);

        const current = items[index];
        const expanded = current.dataset.expanded;

        if (e.key === "ArrowRight") {
            // Open what is closed, otherwise step into it
            if (expanded === "false") {
                e.preventDefault();
                current.click();
                return;
            }
            return focus(items[index + 1]);
        }

        // ArrowLeft closes what is open, otherwise steps out to the parent
        if (expanded === "true") {
            e.preventDefault();
            current.click();
            return;
        }
        const level = Number(current.dataset.level);
        for (let i = index - 1; i >= 0; i--) {
            if (Number(items[i].dataset.level) < level) return focus(items[i]);
        }
    };

    return { ref, onKeyDown };
}
