import validator from './validator'

/**
 * 环境检测：
 * 微信小程序
 * 支付宝小程序
 * Nodejs
 */
const isWxMini = typeof wx !== 'undefined' && !!wx.showToast
const isAliMini = typeof my !== 'undefined' && !!my.showToast
const isBrowser = typeof window !== 'undefined' && !!window.alert

class WeValidator {

    static defaultOptions = {
        rules: {},
        messages: {},
        onMessage: null
    }

    /**
     * 获取字段值
     * @param {String} name 字段名称
     */
    static $value = (name) => ((value, data) => data[name])

    /**
     * 动态添加验证规则（全局）
     * @param {String} ruleName 规则名称
     * @param {Function} method 规则验证函数
     */
    static addRule = (ruleName, method) => {
        if(validator.hasOwnProperty(ruleName) || typeof method !== 'function') return
        
        validator[ruleName] = (value, ...param) => method.call(validator, value, param)

        WeValidator[ruleName] = validator[ruleName]
    }

    constructor(options = {}) {
        this.options = Object.assign({}, WeValidator.defaultOptions, options);

        this.checkRules()
    }

    /**
     * 显示错误提示
     */
    showErrorMessage(params, onMessage) {
        // checkData(params, onMessage)
        if(typeof onMessage === 'function'){
            return onMessage(params)
        }

        // 参数配置 new WeValidator({ onMessage })
        if(typeof this.options.onMessage === 'function'){
            return this.options.onMessage(params)
        }

        // 全局配置 WeValidator.onMessage
        if(typeof WeValidator.onMessage === 'function'){
            return WeValidator.onMessage(params)
        }
        
        // 微信小程序
        if(isWxMini) {
            return wx.showToast({
                title: params.msg,
                icon: 'none'
            })
        }
        
        // 支付宝小程序
        if(isAliMini){
            return my.showToast({
                content: params.msg,
                type: 'none'
            })
        }

        // 浏览器端
        if(isBrowser) alert(params.msg)
    }

    /**
     * 验证配置规则是否无效
     */
    isRuleInvalid(ruleName, attr) {
        if (!validator.hasOwnProperty(ruleName)) {
            console.warn && console.warn(`没有此验证类型：${ruleName}，字段：${attr}`);
            return true
        }
    }

    /**
     * 动态添加规则
     */
    addRules(options = {}) {
      Object.assign(this.options.rules, options.rules);
      Object.assign(this.options.messages, options.messages);

      this.checkRules()
    }

    /**
     * 动态删除规则
     */
    removeRules(rules) {
      if(!(rules instanceof Array)) throw new Error('参数须为数组');
      
      for(let i = 0; i < rules.length; i++){
        let key = rules[i];

        delete this.options.rules[key];
      }
    }

    /**
     * 验证所有配置规则是否正确
     */
    checkRules() {
        let _rules_ = this.options.rules;

        // 遍历字段
        for (let attr in _rules_) {
            // 遍历验证规则
            for (let ruleName in _rules_[attr]) {
                if (this.isRuleInvalid(ruleName, attr)) continue;
            }
        }
    }

    /**
     * 验证表单数据
     */
    checkData(data, onMessage, showMessage = true) {
        let _rules_ = this.options.rules;
        let _messages_ = this.options.messages;

        // 遍历字段
        for (let attr in _rules_) {
            // 遍历验证规则
            for (let ruleName in _rules_[attr]) {
                if (this.isRuleInvalid(ruleName, attr)) continue;

                let ruleValue = _rules_[attr][ruleName];
                let value = '';

                if (data.hasOwnProperty(attr)) {
                    value = data[attr];
                }

                let args = [];

                args.push(value);

                switch (Object.prototype.toString.call(ruleValue)) {
                    case '[object Function]': // 动态属性校验时应该使用函数
                        ruleValue = ruleValue(value, data);
                        args.push(ruleValue);
                        break;
                    case '[object Array]':
                        args = args.concat(ruleValue);
                        break;
                    default:
                        args.push(ruleValue);
                        break;
                }

                if (!validator[ruleName].apply(validator, args)) {
                  // 验证不通过
                  if (showMessage && _messages_.hasOwnProperty(attr) && _messages_[attr][ruleName]) {
                      let params = {
                          name: attr,
                          value: args.splice(0, 1)[0],
                          param: args,
                          rule: ruleName,
                          msg: _messages_[attr][ruleName]
                      }
                      this.showErrorMessage(params, onMessage);
                  }
                  return false;
                }
            }
        }

        return true;
    }

    /**
     * 校验数据是否有效，不提示
     */
    isValid(data) {
      return this.checkData(data, null, false)
    }

}

// validator => WeValidator
for (let attr in validator) {
    if(!validator.hasOwnProperty(attr)) continue
    
    WeValidator[attr] = validator[attr]
}

module.exports = WeValidator