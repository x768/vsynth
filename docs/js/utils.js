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
