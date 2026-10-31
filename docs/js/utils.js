/**
 * Creates HTML element
 * @param {string} tag TagName
 * @param {obj} attr 
 * @returns {HTMLElement}
 */
export function $e(tag, attr)
{
    const n = document.createElement(tag);
    if (attr) {
        for (const k in attr) {
            n.setAttribute(k, attr[k]);
        }
    }

    function add_c(n1, e) {
        if (e instanceof Element) {
            n1.appendChild(e);
        } else if (e instanceof Array) {
            for (const c of e) {
                add_c(n1, c);
            }
        } else {
            n1.appendChild(document.createTextNode(e));
        }
    }

    for (let i = 2; i < arguments.length; i++) {
        add_c(n, arguments[i]);
    }
    return n;
}

/**
 * Creates a small icon.
 * @param {string} type + or x or d (download icon)
 * @returns {SVGSVGElement}
 */
export function create_icon(type)
{
    const e = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    e.setAttribute('viewBox', '-8,-8,16,16');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    e.classList.add('icon16');
    if (type === '+') {
        p.setAttribute('d', 'M0,-8 L0,8 M-8,0 L8,0');
    } else if (type === 'x') {
        p.setAttribute('d', 'M-6,-6 L6,6 M-6,6 L6,-6');
    } else {
        p.setAttribute('d', 'M0,-8 L0,2 M-4,-2 L0,2 L4,-2 M-7,0 L-7,5 L7,5 L7,0');
    }
    e.appendChild(p);
    return e;
}
