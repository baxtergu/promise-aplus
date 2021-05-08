const PromiseAPlus = require('./PromiseAPlus');
// const PromiseAPlus = require('./PromiseAPlus.zhihu');

const promise = new PromiseAPlus((resolve, reject) => {
    setTimeout(() => {
        resolve('success first');
    }, 2000);
}).then(data => {
    console.log(data);
    return new PromiseAPlus((resolve, reject) => {
        setTimeout(() => {
            resolve('success second');
        }, 2000);
    });
}).then(data => {
    console.log(data);
});