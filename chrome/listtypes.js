// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

List.types.input = function(p, prop) {
  p[0].listdata = this;
  this.p = p;
  var input = this.input = $('<input></input>').addClass('valinput');
  this.label = $('<span></span>').addClass('valdisp');
  this.label.click(function(e) {
    setTimeout(function() {
      input.focus();
    }, 10);
  });
  this.input.focus(function(e) {
    input.select();
  });
  this.input.keypress(function(e) {
    p.trigger('change');
  });
  this.input.keyup(function(e) {
    p.trigger('change');
  });
  this.input.change(function(e) {
    p.trigger('change');
  });
  p.append(this.input).append(this.label);
};

List.types.input.prototype.__defineSetter__('value', function(val) {
  this.input.val(val);
  this.label.text(val);
});

List.types.input.prototype.__defineGetter__('value', function() {
  return this.input.val();
});

List.types.select = function(p, prop) {
  p[0].listdata = this;
  this.p = p;
  var input = this.input = $('<select></select>').addClass('valinput');
  this.label = $('<span></span>').addClass('valdisp');
  if (prop.option == 'static') {
    this.loadOptions(prop.options);
  }
  var select = this;
  this.input.change(function(e) {
    if (p.hasClass('readonly')) {
      select.value = select.lastval;
    } else {
      p.trigger('change');
    }
  });
  this.label.click(function(e) {
    setTimeout(function() {
      input.focus();
    }, 10);
  });
  p.append(this.input).append(this.label);
};

List.types.select.prototype.loadOptions = function(options) {
  this.options = options;
  this.mapping = {};
  this.input.html('');
  for (var i = 0; i < options.length; ++i) {
    this.mapping[options[i].value] = options[i].text;
    var o = $('<option></option>').val(options[i].value).text(options[i].text);
    this.input.append(o);
  }
};

List.types.select.prototype.__defineGetter__('value', function() {
  return this.input.val();
});

List.types.select.prototype.__defineSetter__('value', function(val) {
  this.lastval = val;
  this.input.val(val);
  this.label.text(this.mapping[val]);
});

List.types.checkbox = function(p, prop) {
  p[0].listdata = this;
  this.p = p;
  var input = this.input = $('<input type="checkbox">').addClass('valcheck');
  var box = this;
  this.input.change(function(e) {
    if (p.hasClass('readonly')) {
      box.value = box.lastval;
    } else {
      p.trigger('change');
    }
  });
  p.append(this.input);
};

List.types.checkbox.prototype.__defineGetter__('value', function() {
  return this.input[0].checked;
});

List.types.checkbox.prototype.__defineSetter__('value', function(val) {
  this.lastval = val;
  this.input[0].checked = val;
});

List.types.button = function(p, prop) {
  p[0].listdata = this;
  this.p = p;
  var input = this.input = $('<button>');
  if (prop.caption) {
    input.text(prop.caption);
  }
  input.click(function(e) {
    p.trigger('command');
    return false;
  });
  p.append(this.input);
};

List.types.button.prototype.__defineGetter__('value', function() {
  return undefined;
});

