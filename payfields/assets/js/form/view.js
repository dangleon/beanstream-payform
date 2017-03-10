(function(window) {
    'use strict';

    /**
     * The View presents the model and notifies the Controller of UI events.
     */
    function FormView(model, currentScript) {
        this._model = model;
        this.submit = new beanstream.Event(this);
        this.currentScript = currentScript;
    }

    FormView.prototype = {
        init: function() {
            var self = this;
            self.cacheDom();
            self.readAttributes();
            self.attachDomListeners();
        },
        cacheDom: function(id) {

            this.form = window.beanstream.Helper.getParentForm(this.currentScript);
            this.head = document.getElementsByTagName('head')[0];
            this.submitBtn = this.form.querySelector('input[type=submit]');
            if (!this.submitBtn) {
                this.submitBtn = this.form.querySelector('button[type=submit]');
            }

            var urlArray = this.currentScript.src.split('/');
            this.host = urlArray[0] + '//' + urlArray[2] + '/' + urlArray[3];

            this.domTargets = {};

            var fields = this._model.getFields();

            for (var field in fields) {
                var input = field + '_input';
                var error = field + '_error';

                this.domTargets[input] =
                    this.form.querySelector('[data-beanstream-target=' + input + ']');

                this.domTargets[error] =
                    this.form.querySelector('[data-beanstream-target=' + error + ']');

                // Set flags. If target missing for any input, ignore all input targets
                this._model.setDomTargetsFound('inputs', true);
                this._model.setDomTargetsFound('errors', true);

                if (this.domTargets[input] === null) {
                    this._model.setDomTargetsFound('inputs', false);
                }
                if (this.domTargets[error] === null) {
                    this._model.setDomTargetsFound('errors', false);
                }
            }
        },
        readAttributes: function() {
            var self = this;

            // Note: Preferred behaviour is to submit by default,
            // not fixing bug until versioning server implemented to avoid breaking legacy integrations

            var submit = false;
            var submitProp = self.currentScript.getAttribute('data-submitForm');
            if (submitProp && submitProp.toLowerCase() === 'true') {
                submit = true;
            }

            this._model.setSubmitForm(submit);
        },
        submitParentForm: function() {
            var self = this;
            self.form.submit();
        },
        attachDomListeners: function() {
            var self = this;

            /*
            // toDo: listen to submit event rather than click and custom events (breaking change)
            self.form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    self.submit.notify(e);
                }.bind(self), false);
            */

            // listening for custom event to support legacy intigrations
            self.form.addEventListener('beanstream_payfields_tokenize', function(e) {
                    self.submit.notify(e);
                }.bind(self), false);

            // listening to click event to support legacy intigrations
            if (self.submitBtn) {
                self.submitBtn.addEventListener('click', function(e) {
                    self.submit.notify(e);

                    // preventing default if prop set support legacy intigrations
                    if (!this._model.getSubmitForm()) {
                        e.preventDefault();
                    }
                }.bind(self), false);
            }
        },

        render: function(viewCmd, parameter) {
            var self = this;
            var viewCommands = {
                enableSubmitButton: function(parameter) {
                    if (self.submitBtn) {
                        self.submitBtn.disabled = Boolean(!parameter);
                    }
                },
                injectStyles: function(parameter) {
                    var fileref = document.createElement('link');
                    fileref.setAttribute('rel', 'stylesheet');
                    fileref.setAttribute('type', 'text/css');
                    fileref.setAttribute('href', parameter);

                    if (typeof fileref !== 'undefined') {
                        self.head.appendChild(fileref);
                    }
                },
                appendToken: function(value) {
                    var input = self.form.querySelector('input[name=singleUseToken]');

                    if (input) {
                        input.value = value;
                    } else {
                        input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'singleUseToken';
                        input.value = value;
                        self.form.appendChild(input);
                    }
                },
                setFocusNext: function(sender) {
                    var currentEl = sender._config.id;

                    // toDo: these inputs should be cached
                    var inputs = self.form.getElementsByTagName('input');

                    var currentInput = self.getIndexById(inputs, currentEl);

                    if (inputs[currentInput + 1]) {
                        inputs[currentInput + 1].focus();
                    } else {
                        if (self.submitBtn) {
                            self.submitBtn.focus();
                        }
                    }
                }
            };

            viewCommands[viewCmd](parameter);
        },
        getIndexById: function(source, id) {
            for (var i = 0; i < source.length; i++) {
                if (source[i].getAttribute('data-beanstream-id') === id) {
                    return i;
                }
            }
        }
    };

    // Export to window
    window.beanstream = window.beanstream || {};
    window.beanstream.FormView = FormView;
})(window);
