/**
 * 梅沙科技前端监控脚本 - MeishaFEWatch v1.0.2
 * Author: iampomelo <iampomelo@foxmail.com>
 * Copyright (c) 2017 Meisha Technology
 */

declare const define: any;
(function (root, factory) {
  if (typeof exports === 'object' && typeof module === 'object') {
    module.exports = factory();
  }
  else if (typeof define === 'function' && define.amd) {
    define([], factory);
  }
  else if (typeof exports === 'object') {
    exports['MeishaWatch'] = factory();
  }
  else {
    root['MeishaWatch'] = factory();
  }
})(window, function () {
  const env = {
    wechat: !!navigator.userAgent.toLowerCase().match(/MicroMessenger/i),
    iOS: !!navigator.userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/),
    Android: !!navigator.userAgent.match(/Android/i),
    dev: /127.0.0.1|192.168|localhost/.test(window.location.host)
  };
  interface Settings {
    isReport: boolean; // 是否上报信息
    reportURL: string; // 接收错误信息接口的URL
    projectId: string; // 项目id
    partitionId: string; // 模块id
  }

  class MeishaWatch {
    private settings: Settings = {
      isReport: true,
      reportURL: '',
      projectId: '',
      partitionId: ''
    }; // 配置选项
    private __logs: object[] = []; // 实际的记录
    private logs: object[]; // 追踪的记录
    private user: any = ''; // 用户信息
    private uniqueId: string = geneUniqueId(); // 本次访问的id
    private timer: any = null; // 定时器id
    private reportTimes: number = 0; // 已经上报的次数

    constructor() {
      if (env.iOS) {
        Object.defineProperty(this, 'logs', {
          value: [],
          configurable: true,
          enumerable: true,
          writable: true
        });
        Object.defineProperty(this, 'logs', {
          get() {
            return this.__logs;
          },
          set(value) {
            this.__logs = value;
            if (value.length) {
              this.checkLogs();
            }
          }
        });
      } else {
        this.logs = [];
      }
      this.agentConsole();
      this.agentAJAX();
      this.configSender();
      this.configListener();
    }

    init(settings: Settings): void {
      this.settings = settings;
    }

    /**
     * 收集console打印的记录
     */
    agentConsole(): void {
      const methodList: string[] = ['log', 'info', 'warn', 'debug', 'error'];
      methodList.forEach(type => {
        const method = console[type];
        console[type] = (...args) => {
          if (args.length && args[0] !== '[MeishaWatch Console]') {
            this.logs = [...this.logs, ...[{
              msg: args.map(v => {
                return (typeof v === 'object') ? JSON.stringify(decycle(v, undefined)) : v;
              }).join(','),
              url: window.location.href,
              type
            }]];
          }
          method.apply(console, args);
        };
      });
    }

    /**
     * 收集AJAX请求错误信息
     */
    agentAJAX(): void {
      const msw = this;
      const open = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function () {
        const req = this;
        const args = [].slice.call(arguments), method = args[0], url = args[1];
        const onreadystatechange = req.onreadystatechange || function () {
          };
        req.onreadystatechange = function () {
          if (req.readyState === 4 && req.status >= 400) {
            msw.logs = [...msw.logs, ...[{
              msg: `${method} ${url} ${req.status}`,
              url: window.location.href,
              type: 'error'
            }]];
          }
          return onreadystatechange.apply(req, arguments);
        };
        return open.apply(req, args);
      };
    }

    /**
     * 收集全局错误信息
     */
    configListener(): void {
      window.onerror = (msg, url, line, col, error) => {
        let errMsg: string = msg;
        if (error && error.stack) {
          errMsg = processStackMsg(error);
        }
        this.logs = [...this.logs, ...[{
          msg: errMsg.substr(0, 500),
          url: window.location.href,
          type: 'error',
          line,
          col
        }]];
      };
    }

    /**
     * 发送性能和错误信息至后端
     */
    configSender(): void {
      if (env.iOS) {
        window.addEventListener('load', () => {
          this.report(true);
        }, false);
      }
      window.addEventListener('unload', () => {
        this.report(false);
      }, false);
      if (env.wechat && env.Android) {
        let hidden = 'hidden';
        if (hidden in document) {
          document.addEventListener('visibilitychange', () => {
            if (document[hidden]) {
              this.report(false);
            }
          }, false);
        } else if ((hidden = 'webkitHidden') in document) {
          document.addEventListener('webkitvisibilitychange', () => {
            if (document[hidden]) {
              this.report(false);
            }
          }, false);
        }
      }
    }

    /**
     * 设置用户信息
     * @param user
     */
    public setUser(user: any): void {
      this.user = user;
    }

    /**
     * 发送请求，错误上报
     * @param async 是否异步请求
     */
    public report(async: boolean = true): void {
      if (this.settings) {
        let {reportURL, projectId, partitionId, isReport = true} = this.settings;
        if (isReport && this.reportTimes < 20) {
          if (reportURL && projectId && partitionId) {
            const performance = window.performance;
            const times = {
              loadPage: -1, // 页面加载完成的时间
              domReady: -1, // 解析DOM树结构的时间
              loadRes: -1 // 请求资源的时间
            };
            if (performance) {
              const t = performance.timing;
              times.loadPage = t.loadEventEnd - t.navigationStart;
              times.domReady = t.domComplete - t.responseEnd;
              times.loadRes = t.responseEnd - t.requestStart;
            }
            const user = (isType(this.user, 'Number') || isType(this.user, 'String')) ? this.user : JSON.stringify(this.user);
            const logs = JSON.stringify(decycle(this.logs.slice(), undefined));
            this.logs = [];
            try {
              AJAX(reportURL, 'POST', {
                projectId,
                partitionId,
                logs,
                times: JSON.stringify(times),
                user,
                uniqueId: this.uniqueId
              }, async, () => {
              }, () => {
              });
            } catch (e) {
            } finally {
              this.reportTimes++;
            }
          }
        }
      }
    }

    /**
     * Vue插件调用
     * @returns {object}
     */
    public useVue(): object {
      const msw = this;
      return {
        install(Vue): void {
          const ver: string[] = Vue.version && Vue.version.split('.') || [];
          if (+ver[0] >= 2 && +ver[1] >= 2) {
            Vue.config.errorHandler = (err, vm, info) => {
              if (env.dev) {
                console.error('[MeishaWatch Console]', err);
              }
              let errMsg: string = err ? (err.stack ? processStackMsg(err) : err) : '';
              if (info) {
                errMsg = `[Info: ${info}]->${errMsg}`;
              }
              if (vm && vm.$options && vm.$options.name) {
                errMsg = `[Component Name: ${vm.$options.name}]->${errMsg}`;
              }
              msw.logs = [...msw.logs, ...[{
                msg: errMsg,
                url: window.location.href,
                type: 'error'
              }]];
            };
          }
          if (getQueryString('devtools')) {
            Vue.config.devtools = true;
          }
        }
      };
    }

    checkLogs(): void {
      clearTimeout(this.timer);
      if (this.logs.length >= 10) {
        this.report();
      } else {
        this.timer = setTimeout(this.report, 3000);
      }
    }
  }

  /**
   * 格式化错误信息
   * @param error
   * @returns {string}
   */
  function processStackMsg(error): string {
    let stack: string = error.stack
      .replace(/\n/gi, '')
      .split(/\bat\b/)
      .slice(0, 9)
      .join('@')
      .replace(/\?[^:]+/gi, '');
    const msg: string = error.toString();
    if (stack.indexOf(msg) < 0) {
      stack = msg + '@' + stack;
    }
    return stack;
  }

  /**
   * 生成唯一的id
   * @returns {string}
   */
  function geneUniqueId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 获取url参数
   * @param param 参数名
   * @returns {string}
   */
  function getQueryString(param: string): string {
    const r = window.location.search.substr(1).match(new RegExp('(^|&)' + param + '=([^&]*)(&|$)', 'i'));
    return r ? decodeURI(r[2]) : '';
  }

  /**
   * 将对象转化为url参数字符串
   * @param obj
   * @returns {string}
   */
  function toDataString(obj: object): string {
    let str: string = '';
    for (let prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        str += '&' + prop + '=' + obj[prop];
      }
    }
    return str.slice(1);
  }

  /**
   * 简单的AJAX
   * @param url 请求地址
   * @param method 请求方法
   * @param data 请求参数
   * @param async 是否异步请求（默认为true）
   * @param successCb 成功回调
   * @param errorCb 错误回调
   * @constructor
   */
  function AJAX(url: string, method: string, data: object, async: boolean = true, successCb, errorCb): void {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        ((xhr.status === 200) ? successCb : errorCb)(JSON.parse(xhr.responseText));
      }
    };
    xhr.open(method, method.toUpperCase() === 'GET' ? (url + '?' + toDataString(data)) : url, async);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(toDataString(data));
  }

  /**
   * 判断val是否为type类型的值
   * @param val
   * @param type 可能的值为Function, Object, Array, Number, String, RegExp, Null, Undefined, Boolean, Symbol, Date等
   * @returns {boolean}
   */
  function isType(val: any, type: string): boolean {
    if (type === 'Number' && Number.isNaN(val)) {
      return false;
    }
    return toString.call(val).replace(/.*\s(.*)]$/, '$1') === type;
  }

  /**
   * 去除循环引用
   * @param object 待处理的对象
   * @param replacer 对对象值遍历处理的方法
   * @returns {object} 去除循环引用的对象
   */
  function decycle(object: object, replacer: ((value: any) => any) | undefined): object {

    const obj2Path: WeakMap<any, string> = new WeakMap();

    return (function derez(value: any, path: string) {
      let oldPath: string;
      let newObj: object;
      if (replacer !== undefined) {
        value = replacer(value);
      }
      if (typeof value === 'object' && value !== null &&
        !(value instanceof Boolean) &&
        !(value instanceof Date) &&
        !(value instanceof Number) &&
        !(value instanceof RegExp) &&
        !(value instanceof String)) {
        oldPath = obj2Path.get(value);
        if (oldPath !== undefined) {
          return {
            $ref: oldPath
          };
        }
        obj2Path.set(value, path);
        if (Array.isArray(value)) {
          newObj = value.map((v, i) => {
            return derez(v, path + '[' + i + ']');
          });
        } else {
          newObj = {};
          Object.keys(value).forEach(key => {
            newObj[key] = derez(value[key], path + '[' + key + ']');
          });
        }
        return newObj;
      }
      return value;
    }(object, '$'));
  }

  return new MeishaWatch();
});