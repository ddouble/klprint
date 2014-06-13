// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

/*
Rule: {
  identifier:     an unique identifier
  title:          description
  type:           Can be "wild", "regex", "clsid"
  value:          pattern, correspond to type
  userAgent:      the useragent value. See var "agents" for options.
  script:         script to inject. Separated by spaces
}

Order: {
  status:         enabled / disabled / custom
  position:       default / custom
  identifier:     identifier of rule
}

Issue: {
  type:           Can be "wild", "regex", "clsid"
  value:          pattern, correspond to type
  description:    The description of this issue
  issueId:        Issue ID on issue tracking page
  url:            optional, support page for issue tracking.
                  Use code.google.com if omitted.
}

ServerSide:
ActiveXConfig: {
  version:        version
  rules:          object of user-defined rules, propertied by identifiers
  defaultRules:   ojbect of default rules
  scripts:        mapping of workaround scripts, by identifiers.
  order:          the order of rules
  cache:          to accerlerate processing
  issues:         The bugs/unsuppoted sites that we have accepted.
  misc:{
    lastUpdate:   last timestamp of updating
    logEnabled:   log
    tracking:     Allow GaS tracking.
    verbose:      verbose level of logging
  }
}

PageSide:
ActiveXConfig: {
  pageSide:       Flag of pageSide.
  pageScript:     Helper script to execute on context of page
  extScript:      Helper script to execute on context of extension
  pageRule:       If page is matched.
  clsidRules:     If page is not matched or disabled. valid CLSID rules
  logEnabled:     log
  verbose:        verbose level of logging
}
 */

function ActiveXConfig(input)
{
  var settings;
  if (input === undefined) {
    var defaultSetting = {
      version: 3,
      rules: {},
      defaultRules: {},
      scriptContents: {},
      scripts: {},
      order: [],
      notify: [],
      issues: [],
      blocked: [],
      misc: {
        lastUpdate: 0,
        logEnabled: false,
        tracking: true,
        verbose: 3
      }
    };
    input = defaultSetting;
  }

  settings = ActiveXConfig.convertVersion(input);
  settings.removeInvalidItems();
  settings.update();
  return settings;
}

var settingKey = 'setting';

clsidPattern = /[^0-9A-F][0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}[^0-9A-F]/;

var agents = {
  ie9: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)',
  ie8: 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; WOW64; Trident/4.0)',
  ie7: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0; WOW64;)',
  ff7win: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:7.0.1)' +
      ' Gecko/20100101 Firefox/7.0.1',
  ip5: 'Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X)' +
      ' AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1' +
      ' Mobile/9A334 Safari/7534.48.3',
  ipad5: 'Mozilla/5.0 (iPad; CPU OS 5_0 like Mac OS X) AppleWebKit/534.46' +
      '(KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3'
};

function getUserAgent(key) {
  // This script is always run under sandbox, so useragent should be always
  // correct.
  if (!key || !(key in agents)) {
    return '';
  }
  var current = navigator.userAgent;
  var wow64 = current.indexOf('WOW64') >= 0;
  var value = agents[key];
  if (!wow64) {
    value = value.replace(' WOW64;', '');
  }
  return value;
}

ActiveXConfig.convertVersion = function(setting) {
  if (setting.version == 3) {
    if (!setting.blocked) {
      setting.blocked = [];
    }
    setting.__proto__ = ActiveXConfig.prototype;
    return setting;
  } else if (setting.version == 2) {
    function parsePattern(pattern) {
      pattern = pattern.trim();
      var title = pattern.match(/###(.*)/);
      if (title) {
        return {
          pattern: pattern.match(/(.*)###/)[1].trim(),
          title: title[1].trim()
        };
      } else {
        return {
          pattern: pattern,
          title: 'Rule'
        };
      }
    }

    var ret = new ActiveXConfig();

    if (setting.logEnabled) {
      ret.misc.logEnabled = true;
    }
    var urls = setting.url_plain.split('\n');
    for (var i = 0; i < urls.length; ++i) {
      var rule = ret.createRule();

      var pattern = parsePattern(urls[i]);
      rule.title = pattern.title;
      var url = pattern.pattern;

      if (url.substr(0, 2) == 'r/') {
        rule.type = 'regex';
        rule.value = url.substr(2);
      } else {
        rule.type = 'wild';
        rule.value = url;
      }
      ret.addCustomRule(rule, 'convert');
    }
    var clsids = setting.trust_clsids.split('\n');
    for (var i = 0; i < clsids.length; ++i) {
      var rule = ret.createRule();
      rule.type = 'clsid';
      var pattern = parsePattern(clsids[i]);
      rule.title = pattern.title;
      rule.value = pattern.pattern;
      ret.addCustomRule(rule, 'convert');
    }
    firstUpgrade = true;
    return ret;
  }
};

ActiveXConfig.prototype = {
  // Only used for user-scripts
  shouldEnable: function(object) {
    if (this.pageRule) {
      return this.pageRule;
    }
    var clsidRule = this.getFirstMatchedRule(object, this.clsidRules);
    if (clsidRule) {
      return clsidRule;
    } else {
      return null;
    }
  },

  createRule: function() {
    return {
      title: 'Rule',
      type: 'wild',
      value: '',
      userAgent: '',
      scriptItems: ''
    };
  },

  removeInvalidItems: function() {
    if (this.pageSide) {
      return;
    }
    function checkIdentifierMatches(item, prop) {
      if (typeof item[prop] != 'object') {
        console.log('reset ', prop);
        item[prop] = {};
      }
      for (var i in item[prop]) {
        var ok = true;
        if (typeof item[prop][i] != 'object') {
          ok = false;
        }
        if (ok && item[prop][i].identifier != i) {
          ok = false;
        }
        if (!ok) {
          console.log('remove corrupted item ', i, ' in ', prop);
          delete item[prop][i];
        }
      }
    }
    checkIdentifierMatches(this, 'rules');
    checkIdentifierMatches(this, 'defaultRules');
    checkIdentifierMatches(this, 'scripts');
    checkIdentifierMatches(this, 'issues');
    var newOrder = [];
    for (var i = 0; i < this.order.length; ++i) {
      if (this.getItem(this.order[i])) {
        newOrder.push(this.order[i]);
      } else {
        console.log('remove order item ', this.order[i]);
      }
    }
    this.order = newOrder;
  },

  addCustomRule: function(newItem, auto) {
    if (!this.validateRule(newItem)) {
      return;
    }
    var identifier = this.createIdentifier();
    newItem.identifier = identifier;
    this.rules[identifier] = newItem;
    this.order.push({
      status: 'custom',
      position: 'custom',
      identifier: identifier
    });
    this.update();
    trackAddCustomRule(newItem, auto);
  },

  updateDefaultRules: function(newRules) {
    var deleteAll = false, ruleToDelete = {};
    if (typeof this.defaultRules != 'object') {
      // There might be some errors!
      // Clear all defaultRules
      console.log('Corrupted default rules, reload all');
      deleteAll = true;
      this.defaultRules = {};
    } else {
      for (var i in this.defaultRules) {
        if (!(i in newRules)) {
          console.log('Remove rule ' + i);
          ruleToDelete[i] = true;
          delete this.defaultRules[i];
        }
      }
    }

    var newOrder = [];
    for (var i = 0; i < this.order.length; ++i) {
      if (this.order[i].position == 'custom' ||
          (!deleteAll && !ruleToDelete[this.order[i].identifier])) {
        newOrder.push(this.order[i]);
      }
    }
    this.order = newOrder;

    var position = 0;
    for (var i in newRules) {
      if (!(i in this.defaultRules)) {
        this.addDefaultRule(newRules[i], position);
        position++;
      }
      this.defaultRules[i] = newRules[i];
    }
  },
  loadDefaultConfig: function() {

    var setting = this;
    $.ajax({
      url: '/settings/setting.json',
      dataType: 'json',
      success: function(nv, status, xhr) {
        console.log('Update default rules');
        setting.updateDefaultRules(nv);
        setting.update();
      }
    });

    $.ajax({
      url: '/settings/scripts.json',
      dataType: 'json',
      success: function(nv, status, xhr) {
        console.log('Update scripts');
        setting.scripts = nv;
        setting.loadAllScripts();
        setting.update();
      }
    });

    $.ajax({
      url: '/settings/issues.json',
      dataType: 'json',
      success: function(nv, status, xhr) {
        setting.issues = nv;
        setting.update();
      }
    });
  },

  getPageConfig: function(href) {
    var ret = {};
    ret.pageSide = true;
    ret.version = this.version;
    ret.verbose = this.misc.verbose;
    ret.logEnabled = this.misc.logEnabled;
    ret.pageRule = this.getFirstMatchedRule({href: href});
    if (!ret.pageRule) {
      ret.clsidRules = this.cache.clsidRules;
    } else {
      var script = this.getScripts(ret.pageRule.script);
      ret.pageScript = script.page;
      ret.extScript = script.extension;
    }
    return ret;
  },

  getFirstMatchedRule: function(object, rules) {
    var useCache = false;
    if (!rules) {
      rules = this.cache.validRules;
      useCache = true;
    }
    if (Array.isArray(rules)) {
      for (var i = 0; i < rules.length; ++i) {
        if (this.isRuleMatched(rules[i], object, useCache ? i : -1)) {
          return rules[i];
        }
      }
    } else {
      for (var i in rules) {
        if (this.isRuleMatched(rules[i], object)) {
          return rules[i];
        }
      }
    }
    return null;
  },

  getMatchedIssue: function(filter) {
    return this.getFirstMatchedRule(filter, this.issues);
  },

  activeRule: function(rule) {
    for (var i = 0; i < this.order.length; ++i) {
      if (this.order[i].identifier == rule.identifier) {
        if (this.order[i].status == 'disabled') {
          this.order[i].status = 'enabled';
          trackAutoEnable(rule.identifier);
        }
        break;
      }
    }
    this.update();
  },

  validateRule: function(rule) {
    var ret = true;
    try {
      if (rule.type == 'wild') {
        ret &= this.convertUrlWildCharToRegex(rule.value) != null;
      } else if (rule.type == 'regex') {
        ret &= rule.value != '';
        var r = new RegExp(rule.value, 'i');
      } else if (rule.type == 'clsid') {
        var v = rule.value.toUpperCase();
        if (!clsidPattern.test(v) || v.length > 55)
          ret = false;
      }
    } catch (e) {
      ret = false;
    }
    return ret;
  },

  isRuleMatched: function(rule, object, id) {
    if (rule.type == 'wild' || rule.type == 'regex') {
      var regex;
      if (id >= 0) {
        regex = this.cache.regex[id];
      } else if (rule.type == 'wild') {
        regex = this.convertUrlWildCharToRegex(rule.value);
      } else if (rule.type == 'regex') {
        regex = new RegExp('^' + rule.value + '$', 'i');
      }

      if (object.href && regex.test(object.href)) {
        return true;
      }
    } else if (rule.type == 'clsid') {
      if (object.clsid) {
        var v1 = clsidPattern.exec(rule.value.toUpperCase());
        var v2 = clsidPattern.exec(object.clsid.toUpperCase());
        if (v1 && v2 && v1[0] == v2[0]) {
          return true;
        }
      }
    }
    return false;
  },

  getScripts: function(script) {
    var ret = {
      page: '',
      extension: ''
    };
    if (!script) {
      return ret;
    }
    var items = script.split(' ');
    for (var i = 0; i < items.length; ++i) {
      if (!items[i] || !this.scripts[items[i]]) {
        continue;
      }
      var name = items[i];
      var val = '// ';
      val += items[i] + '\n';
      val += this.scriptsContents[name];
      val += '\n\n';
      ret[this.scripts[name].context] += val;
    }
    return ret;
  },

  convertUrlWildCharToRegex: function(wild) {
    try {
      function escapeRegex(str, star) {
        if (!star) star = '*';
        var escapeChars = /([\.\\\/\?\{\}\+\[\]])/g;
        return str.replace(escapeChars, '\\$1').replace('*', star);
      }

      wild = wild.toLowerCase();
      if (wild == '<all_urls>') {
        wild = '*://*/*';
      }
      var pattern = /^(.*?):\/\/(\*?[^\/\*]*)\/(.*)$/i;
      // pattern: [all, scheme, host, page]
      var parts = pattern.exec(wild);
      if (parts == null) {
        return null;
      }
      var scheme = parts[1];
      var host = parts[2];
      var page = parts[3];

      var regex = '^' + escapeRegex(scheme, '[^:]*') + ':\\/\\/';
      regex += escapeRegex(host, '[^\\/]*') + '/';
      regex += escapeRegex(page, '.*');
      return new RegExp(regex, 'i');
    } catch (e) {
      return null;
    }
  },

  update: function() {
    if (this.pageSide) {
      return;
    }
    this.updateCache();
    if (this.cache.listener) {
      this.cache.listener.trigger('update');
    }
    this.save();
  },

  // Please remember to call update() after all works are done.
  addDefaultRule: function(rule, position) {
    console.log('Add new default rule: ', rule);
    var custom = null;
    if (rule.type == 'clsid') {
      for (var i in this.rules) {
        var info = {href: 'not-a-URL-/', clsid: rule.value};
        if (this.isRuleMatched(this.rules[i], info, -1)) {
          custom = this.rules[i];
          break;
        }
      }
    } else if (rule.keyword && rule.testUrl) {
      // Try to find matching custom rule
      for (var i in this.rules) {
        if (this.isRuleMatched(this.rules[i], {href: rule.testUrl}, -1)) {
          if (this.rules[i].value.toLowerCase().indexOf(rule.keyword) != -1) {
            custom = this.rules[i];
            break;
          }
        }
      }
    }
    var newStatus = 'disabled';
    if (custom) {
      console.log('Convert custom rule', custom, ' to default', rule);
      // Found a custom rule which is similiar to this default rule.
      newStatus = 'enabled';
      // Remove old one
      delete this.rules[custom.identifier];
      for (var i = 0; i < this.order.length; ++i) {
        if (this.order[i].identifier == custom.identifier) {
          this.order.splice(i, 1);
          break;
        }
      }
    }
    this.order.splice(position, 0, {
      position: 'default',
      status: newStatus,
      identifier: rule.identifier
    });
    this.defaultRules[rule.identifier] = rule;
  },
  updateCache: function() {
    if (this.pageSide) {
      return;
    }
    this.cache = {
      validRules: [],
      regex: [],
      clsidRules: [],
      userAgentRules: [],
      listener: (this.cache || {}).listener
    };
    for (var i = 0; i < this.order.length; ++i) {
      if (['custom', 'enabled'].indexOf(this.order[i].status) >= 0) {
        var rule = this.getItem(this.order[i]);
        var cacheId = this.cache.validRules.push(rule) - 1;

        if (rule.type == 'clsid') {
          this.cache.clsidRules.push(rule);
        } else if (rule.type == 'wild') {
          this.cache.regex[cacheId] =
              this.convertUrlWildCharToRegex(rule.value);
        } else if (rule.type == 'regex') {
          this.cache.regex[cacheId] = new RegExp('^' + rule.value + '$', 'i');
        }

        if (rule.userAgent != '') {
          this.cache.userAgentRules.push(rule);
        }

      }
    }
  },

  save: function() {
    if (location.protocol == 'chrome-extension:') {
      // Don't include cache in localStorage.
      var cache = this.cache;
      delete this.cache;
      var scripts = this.scriptsContents;
      delete this.scriptsContents;
      localStorage[settingKey] = JSON.stringify(this);
      this.cache = cache;
      this.scriptsContents = scripts;
    }
  },

  createIdentifier: function() {
    var base = 'custom_' + Date.now() + '_' + this.order.length + '_';
    var ret;
    do {
      ret = base + Math.round(Math.random() * 65536);
    } while (this.getItem(ret));
    return ret;
  },

  getItem: function(item) {
    var identifier = item;
    if (typeof identifier != 'string') {
      identifier = item.identifier;
    }
    if (identifier in this.rules) {
      return this.rules[identifier];
    } else {
      return this.defaultRules[identifier];
    }
  },

  loadAllScripts: function() {
    this.scriptsContents = {};
    setting = this;
    for (var i in this.scripts) {
      var item = this.scripts[i];
      $.ajax({
        url: '/settings/' + item.url,
        datatype: 'text',
        context: item,
        success: function(nv, status, xhr) {
          setting.scriptsContents[this.identifier] = nv;
        }
      });
    }
  }
};

function loadLocalSetting() {
  var setting = undefined;
  if (localStorage[settingKey]) {
    try {
      setting = JSON.parse(localStorage[settingKey]);
    } catch (e) {
      setting = undefined;
    }
  }

  if (!setting) {
    firstRun = true;
  }
  return new ActiveXConfig(setting);
}

function clearSetting() {
  localStorage.removeItem(settingKey);
  setting = loadLocalSetting();
}
