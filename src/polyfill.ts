// @ts-ignore
if (!String.prototype.replaceAll) { 
  // @ts-ignore
  String.prototype.replaceAll = function(search: string | RegExp, replace: string) {
    if (typeof search === 'string') {
      return this.split(search).join(replace);
    } else if (search instanceof RegExp) {
      // If search is a regular expression, use the `replace` method in a loop
      return this.replace(new RegExp(search, 'g'), replace);
    }
    throw new TypeError('The search argument must be a string or a RegExp');
  };
}
