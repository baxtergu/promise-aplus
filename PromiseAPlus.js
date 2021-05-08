const statusEnum = {
  FULFILLED: 'fulfilled',
  REJECTED: 'rejected',
  PENDING: 'pending'
};

const queueMicrotask = func => setTimeout.call(null, func, 0);

// 第二个参数为 then 创建的 promise 以及它的 resolve 和 reject
function resolvePromise(prevResolved, { promise, resolve, reject }) {
  if (promise === prevResolved) {
    return reject(new TypeError('Chaining cycle detect!'));
  }

  // 记录是否改变过状态，一般在 reject 后 resolve 或者 resolve 后 reject 时过滤重复调用
  let called;
  if ((typeof prevResolved === 'object' && prevResolved !== null) || typeof prevResolved === 'function') {
    try {
      const { then } = prevResolved;
      if (typeof then === 'function') {
        then.call(
          prevResolved,
          thenResolvedValue => {
            if (called) return;
            called = true;
            /**
             * ** 最关键的步骤 **
             * 当 promise.then(resolveHandler) 中的 resolveHandler 有返回值且返回值是 Promise 实例的时候，为了便于理解，我们将：
             *    - 当前 then 创建的 Promise 对象记作 outerThenPromise；
             *    - resolveHandler 返回的 Promise 实例中链式调用的 then 创建的 Promise 对象实例记作 innerThenPromiseA, innerThenPromiseB ...
             * 在这种情况下，我们不直接调用 outerThenPromise 的 resolve 方法并传入 innerThenPromiseX，因为：
             *    - innerThenPromiseX 可能会有 then 的链式调用，
             *      我们必须要让 innerThenPromise 中的 then 链式调用回调全部执行完毕后再执行 outerThenPromise 的后续 then 回调。
             *      这里涉及到 resolvePromise 的嵌套调用，可能会有超过 2 层的嵌套调用。
             *      它可以确保 innerThenPromise thenable chain 上的所有回调按照 then 的定义顺序 resolve 后，再 resolve 掉外层的 outerThenPromise
             * 参考：Promise/A+ 2.3.3.3.1
             */
            resolvePromise(thenResolvedValue, { promise, resolve, reject });
          },
          thenRejectedValue => {
            if (called) return;
            called = true;
            reject(thenRejectedValue);
          });
      } else {
        resolve(prevResolved);
      }
    } catch (e) {
      if (called) return;
      called = true;
      reject(e);
    }
  } else {
    // resolveedValue 为 primitive type 时
    resolve(prevResolved)
  }
}

class PromiseAPlus {
  constructor(executor) {
    this.status = statusEnum.PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.onResolvedCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = value => {
      if (this.status === statusEnum.PENDING) {
        this.status = statusEnum.FULFILLED;
        this.value = value;
        this.onResolvedCallbacks.forEach(fn => fn());
      }
    }

    const reject = reason => {
      if (this.status === statusEnum.PENDING) {
        this.status = statusEnum.REJECTED;
        this.reason = reason;
        this.onRejectedCallbacks.forEach(fn => fn());
      }
    }

    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  then(resolvedHandler, rejectedHandler) {
    resolvedHandler = typeof resolvedHandler === 'function' ? resolvedHandler : v => v;
    rejectedHandler = typeof rejectedHandler === 'function' ? rejectedHandler : err => { throw err };

    const thenPromise = new PromiseAPlus((resolve, reject) => {
      if (this.status === statusEnum.FULFILLED) {
        queueMicrotask(() => {
          try {
            const resolvedValue = resolvedHandler(this.value);
            resolvePromise(resolvedValue, { promise: thenPromise, resolve, reject });
          } catch (err) {
            reject(err);
          }
        });
      }

      if (this.status === statusEnum.REJECTED) {
        queueMicrotask(() => {
          try {
            const rejectedReason = rejectedHandler(this.reason);
            resolvePromise(rejectedReason, { promise: thenPromise, resolve, reject });
          } catch (err) {
            reject(err);
          }
        });
      }

      if (this.status === statusEnum.PENDING) {
        this.onResolvedCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              const resolvedValue = resolvedHandler(this.value);
              resolvePromise(resolvedValue, { promise: thenPromise, resolve, reject });
            } catch (err) {
              reject(err);
            }
          });
        });

        this.onRejectedCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              const rejectedReason = rejectedHandler(this.reason);
              resolvePromise(rejectedReason, { promise: thenPromise, resolve, reject });
            } catch (err) {
              reject(err);
            }
          });
        });
      }
    });

    return thenPromise;
  }
}

module.exports = PromiseAPlus;