const tests = require("promises-aplus-tests");
const PromiseAPlus = require('./PromiseAPlus');
// const PromiseAPlus = require('./PromiseAPlus.zhihu');


const deferred = function () {
    let resolve, reject;
    const promise = new PromiseAPlus(function (_resolve, _reject) {
        resolve = _resolve;
        reject = _reject;
    });
    return {
        promise: promise,
        resolve: resolve,
        reject: reject
    };
};
const adapter = {
    deferred
};

tests(adapter, function (err) {
    // All done; output is in the console. Or check `err` for number of failures.
});
