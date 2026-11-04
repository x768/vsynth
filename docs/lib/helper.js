import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { parse_dictionary } from './misc.js';

/**
 * file name to absolute path (docs/files/*)
 * @param {string} fname file name (e.g. dict_js.txt)
 * @returns {string} absolute path
 */
export function get_file_path(fname)
{
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    return path.join(dirname, '..', 'files', fname);
}
/**
 * 
 * @param {string} filename dictionary name (e.g. dict_js.txt)
 * @returns {[object[], object[]]}
 */
export function get_dictionary(filename)
{
    return parse_dictionary(readFileSync(get_file_path(filename), {encoding:'utf-8'}));
}
