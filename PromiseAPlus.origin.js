const PENDING = 'PENDING';
const FULFILLED = 'FULFILLED';
const REJECTED = 'REJECTED';

const resolvePromise = (promise2, x, resolve, reject) => {
  // Promise/A+ 2.3.1 自己等待自己是循环引用，抛出类型错误，终止 promise
  if (promise2 === x) {
    return reject(new TypeError('Chaining cycle detected for promise #<Promise>'));
  }

  // Promise/A+ 2.3.3.3.3 只能调用一次
  let called;

  // 后续的条件要严格判断 保证代码能和别的库一起使用
  if ((typeof x === 'object' && x !== null) || typeof x === 'function') {
    try {
      // 为了判断 resolve 过的就不再 reject 了（比如 resolve 和 reject 同时调用的时候）
      let then = x.then;
      if (typeof then === 'function') {
        /**
         * Promise/A+ 2.3.3.3
         * 不要写成 x.then，直接 then.call 就可以了 因为 x.then 会再次取值，Object.defineProperty
         */
        then.call(x, y => { // 根据 promise 的状态决定是成功还是失败
          if (called) return;
          called = true;
          /**
            * Promise/A+ 2.3.3.3.1
            * 递归解析的过程（因为可能 promise 中还有 promise）
            */
          resolvePromise(promise2, y, resolve, reject);
        }, r => {
          /**
           * Promise/A+ 2.3.3.3.2
           * 只要失败就失败
           */
          if (called) return;
          called = true;
          reject(r);
        });
      } else {
        /**
         * Promise/A+ 2.3.3.4
         * 如果 x.then 是个普通值就直接返回 resolve 作为结果  
         */
        resolve(x);
      }
    } catch (e) {
      /**
       * Promise  A + 2.3.3.2
       */
      if (called) return;
      called = true;
      reject(e);
    }
  } else {
    /**
     * Promise/A+ 2.3.4
     * 如果 x 是个普通值就直接返回 resolve 作为结果
     */
    resolve(x);
  }


}

class PromiseA {
  constructor(executor) {
    // 存放三种状态
    this.status = PENDING;
    // 存放 FULFILLED 状态下的返回值
    this.value = undefined;
    // 存放 REJECTED 状态下的返回值
    this.reason = undefined;
    // 存储 FULFILLED 回调
    this.onResolvedCallbacks = [];
    // 存放 REJECTED 回调
    this.onRejectedCallbacks = [];

    const resolve = value => {
      if (this.status === PENDING) {
        this.status = FULFILLED;
        this.value = value;
        this.onResolvedCallbacks.forEach(fn => fn());
      }
    }

    const reject = reason => {
      if (this.status === PENDING) {
        this.status = REJECTED;
        this.reason = reason;
        this.onRejectedCallbacks.forEach(fn => fn());
      }
    }

    try {
      // 立即执行 executor，并将 resolve 和 reject 作为参数传入
      executor(resolve, reject);
    } catch (error) {
      // 发生异常时候执行 reject 逻辑
      reject(error);
    }
  }

  then(onFulfilled, onRejected) {
    /**
     * Promise/A+ 2.2.1
     * Promise/A+ 2.2.5
     * Promise/A+ 2.2.7.3
     * Promise/A+ 2.2.7.4
     */
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : v => v;

    // 因为错误的值要让后面访问到，所以这里也要跑出个错误，不然会在之后 then 的 resolve 中捕获
    onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err };

    /**
     * Promise/A+ 2.2.7
     * 每次调用 then 都返回一个新的 promise
     */
    let promise2 = new PromiseA((resolve, reject) => {
      if (this.status === FULFILLED) {
        /**
         * Promise/A+ 2.2.2
         * Promise/A+ 2.2.4 --- setTimeout
         */
        setTimeout(() => {
          try {
            /**
             * Promise/A+ 2.2.7.1
             */
            let x = onFulfilled(this.value);
            /**
             * x可能是一个proimise
             */
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            /**
             * Promise/A+ 2.2.7.2
             */
            reject(e)
          }
        }, 0);
      }

      if (this.status === REJECTED) {
        /**
         * Promise/A+ 2.2.3
         */
        setTimeout(() => {
          try {
            let x = onRejected(this.reason);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        }, 0);
      }

      if (this.status === PENDING) {
        this.onResolvedCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onFulfilled(this.value);
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          }, 0);
        });
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onRejected(this.reason);
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          }, 0);
        });
      }
    });

    return promise2;
  }
}

module.exports = PromiseA;