import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * dictionary file name to absolute path
 * @param {string} fname dictionary file name (e.g. dict_js.txt)
 * @returns {string} absolute path
 */
export function get_dictionary_path(fname)
{
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    return path.join(dirname, '..', 'files', fname);
}
