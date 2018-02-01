// @flow

import type { DataResolver } from '../romper';

/**
 * Returns an instance of DataResolver which resolves over the data object passed in
 *
 * @param {Object} data The data object constaining static data
 * @return {Function} A resolver which returns data from the passed in object
 */
export default function (data: Object): DataResolver {
    /**
     * Fetches a piece of data from the pre-configured dictionary
     *
     * @param {string} name The name of the variable to be resolved, in the form of dot nations
     *        (e.g., "foo.bar")
     * @return {Promise.<any>} A promise which resolves to the requested variable, or null if the
     *        variable does not exist
     */
    return (name: string): Promise<any> => Promise.resolve(name.split('.')
        .reduce((obj, key) => ((obj !== null && key in obj) ? obj[key] : null), data));
}
