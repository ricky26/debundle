const replace = require('../extern/replace-method');

// Webpack debundling shim
// Here's what a webpack bundle looks like:
//
// (function(modules) {
//   // webpack require shim is here
// })([
//   function(module, exports, __webpack_require__) {
//     var foo = __webpack_require__(2); // The index of the item to pull in within the array
//   },
//   function(module, exports, __webpack_require__) {
//     "I am foo!";
//   }
// ])
function webpackDecoder(moduleArrayAST, knownPaths) {
  // Check for a module map (this is rare).
  if (moduleArrayAST.type === 'ObjectExpression') {
    return moduleArrayAST.properties.map(({key, value}) => {
      return {
        id: Number(key.value),
        code: value,
      };
    }).filter(i => i.id && i.code);
  }

  // Check for Array(x).concat([]) syntax (super rare!).
  const isArrayConcat = (moduleArrayAST.type === 'CallExpression')
    && moduleArrayAST.callee.object
    && moduleArrayAST.callee.object.callee
    && (moduleArrayAST.callee.object.callee.name === 'Array')
    && (moduleArrayAST.callee.property.name === 'concat');
  if (isArrayConcat) {
    moduleArrayAST = moduleArrayAST.arguments[0];
  }

  // Ensure that the bit of AST being passed is an array
  if (moduleArrayAST.type !== 'ArrayExpression') {
    throw new Error(`The root level IIFE didn't have an array for it's first parameter, aborting...`);
  }

  return moduleArrayAST.elements.map((moduleDescriptor, id) => {
    return {
      id,
      code: moduleDescriptor,
    };
  }).filter(i => i.code);
}

function getModuleFileName(node, knownPaths) {
  let id = node.arguments[0].raw;
  return knownPaths[id] ? knownPaths[id] : `./${id}`;
}

module.exports = webpackDecoder;
