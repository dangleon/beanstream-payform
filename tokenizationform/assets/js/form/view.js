
(function(window) {
    'use strict';

    /**
     * The View presents the model and notifies the Controller of UI events.
     */
    function FormView(model, template) {
        var self = this;
        self._model = model;
        this._template = template;

        this.nextPanel = new beanstream.Event(this);
        this.previousPanel = new beanstream.Event(this);
        this.syncAddresses = new beanstream.Event(this);
        this.tokenUpdated = new beanstream.Event(this);
        this.tokenize = new beanstream.Event(this);
        this.errorsUpdated = new beanstream.Event(this);
    }

    FormView.prototype = {
        init: function(config, panels) {
            var self = this;
            self.panels = panels;
            self.config = config;

            self.render('elements', {config: config, panels: panels});
            self.render('setCustomStyle', {primaryColor: config.primaryColor});
            self.cacheDom(panels);
            self.attachListeners(panels);
            self.render('script', {host: config.host});
            self.attachPayfieldsListeners();

            if (panels.shipping && panels.billing) {
                self.render('navigationRelativeToAddressSync', {sync: true, panels: panels});
            }

        },
        render: function(viewCmd, parameter) {

            var self = this;
            var viewCommands = {
                elements: function() {
                    // parameter.config, parameter.panels
                    if (!self.body) {
                        self.body = document.getElementsByTagName('body')[0];
                    }
                    var template = self._template.show('elements', parameter);
                    var frag = self.createDocFrag(template);
                    self.body.appendChild(frag);
                },
                script: function() {
                    // parameter.host
                    self.script = document.createElement('script');
                    self.script.src = parameter.host + '/payfields/beanstream_payfields.js';
                    self.script.setAttribute('async', true);
                    self.form.appendChild(self.script);
                },
                currentPanel: function() {
                    // parameter.panels, parameter.old, arameter.new

                    self._domPanels[parameter.new].classList.remove('hidden');
                    if ('payform.beanstream.com' === document.domain) {
                        window.mixpanel.track('Show panel', {'panel': parameter.new});
                    }

                    if (parameter.old) {
                        self._domPanels[parameter.old].classList.add('hidden');
                        self.focusFirstElement(self._domPanels[parameter.new]);
                    }
                },
                navigationRelativeToAddressSync: function() {
                    // parameter.panels, parameter.sync

                    var shippingNextButton = self._domPanels.shipping.getElementsByTagName('button')[0];
                    var cardBackButton = self._domPanels.card.getElementsByTagName('a')[1];

                    if (parameter.sync) {

                        if (parameter.panels.billing.next.toUpperCase() === 'CARD') {
                            // shippingNextButton.childNodes[0].childNodes[0].innerHTML = 'Pay';
                            shippingNextButton.innerHTML = 'Pay &#62;';
                        } else {
                            // shippingNextButton.childNodes[0].childNodes[0].innerHTML =
                            //    beanstream.Helper.toSentenceCase(parameter.panels.billing.next) + ' Address';
                            shippingNextButton.innerHTML =
                                beanstream.Helper.toSentenceCase(parameter.panels.billing.next) + ' Address &#62;';
                        }

                        cardBackButton.innerHTML = '<h6>' +
                            beanstream.Helper.toSentenceCase(parameter.panels.billing.previous) + ' Address</h6>';
                    } else {

                        if (parameter.panels.shipping.next.toUpperCase() === 'CARD') {
                            // shippingNextButton.childNodes[0].childNodes[0].innerHTML = 'Pay';
                            shippingNextButton.innerHTML = 'Pay &#62;';
                        } else {
                            // shippingNextButton.childNodes[0].childNodes[0].innerHTML =
                            //    beanstream.Helper.toSentenceCase(parameter.panels.shipping.next) + ' Address';
                            shippingNextButton.innerHTML =
                                beanstream.Helper.toSentenceCase(parameter.panels.shipping.next) + ' Address &#62;';
                        }

                        cardBackButton.innerHTML = '<h6>' +
                            beanstream.Helper.toSentenceCase(parameter.panels.card.previous) + ' Address</h6>';
                    }

                },
                errorBlock: function() {
                    // parameter.errorMessages, parameter.panel

                    var errorBlock = self._domPanels[parameter.panel].getElementsByClassName('error')[0];

                    if (errorBlock) {
                        // errorBlock.innerHTML = '';
                        while (errorBlock.firstChild) {
                            errorBlock.removeChild(errorBlock.firstChild);
                        }

                        if (parameter.errorMessages.length) {
                            var template = self._template.show('errors', parameter);
                            var frag = self.createDocFrag(template);
                            errorBlock.appendChild(frag);

                            errorBlock.classList.remove('hidden');
                        } else {
                            errorBlock.classList.add('hidden');
                        }
                    }

                },
                setCustomStyle: function() {
                    // parameter.primaryColor

                    var primaryColor =  parameter.primaryColor;

                    if (primaryColor != undefined) {

                        var template = self._template.show('customStyling', parameter);

                        var head = document.head || document.getElementsByTagName('head')[0];
                        var style = document.createElement('style');

                        style.type = 'text/css';
                        if (style.styleSheet) {
                            style.styleSheet.cssText = template;
                        } else {
                            style.appendChild(document.createTextNode(template));
                        }

                        head.appendChild(style);
                    }
                }
            };

            viewCommands[viewCmd]();
        },
        focusFirstElement: function(panel) {
            // Auto zoom on iOS safari
            // panel.querySelectorAll('input[type=text]')[0].focus();
        },
        cacheDom: function(panels) {
            var self = this;
            self.form = document.getElementsByTagName('form')[0];

            self._domPanels = {};
            for (var key in panels) {
                self._domPanels[key] = document.getElementById(key + '_panel');
            }
        },
        attachListeners: function(panels) {
            var self = this;

            if (panels.shipping) {
                // Next button
                var button = self._domPanels.shipping.getElementsByTagName('button')[0];
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    e = e || window.event;
                    self.nextPanel.notify(panels.shipping.name);
                }.bind(self), false);

                // Previous button
                var backButtons = self._domPanels.shipping.getElementsByTagName('a');
                if (backButtons.length) {
                    for (var i = 0; i < backButtons.length; i++) {
                        backButtons[i].addEventListener('click', self.onPreviousPanelClick.bind(self), false);
                    }
                }
            }
            if (panels.billing) {
                // Next button
                var button = self._domPanels.billing.getElementsByTagName('button')[0];
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    e = e || window.event;
                    self.nextPanel.notify(panels.billing.name);
                }.bind(self), false);

                // Previous button
                var backButtons = self._domPanels.billing.getElementsByTagName('a');
                if (backButtons.length) {
                    for (var i = 0; i < backButtons.length; i++) {
                        backButtons[i].addEventListener('click', self.onPreviousPanelClick.bind(self), false);
                    }
                }
            }

            if (panels.shipping && panels.billing) {
                var checkbox = self._domPanels.shipping.querySelectorAll('input[type=checkbox]')[0];
                checkbox.addEventListener('click', function(e) {
                    self.syncAddresses.notify(e.target.checked);
                }, false);
            }

            if (panels.card) {
                var button = self._domPanels.card.getElementsByTagName('button')[0];
                button.addEventListener('click', function(e) {
                    e = e || window.event;
                    e.preventDefault();
                    self.tokenize.notify();

                }.bind(self), false);

                // Previous button
                var backButtons = self._domPanels.card.getElementsByTagName('a');
                if (backButtons.length) {
                    for (var i = 0; i < backButtons.length; i++) {
                        backButtons[i].addEventListener('click', self.onPreviousPanelClick.bind(self), false);
                    }
                }
            }

            var closeButton = document.getElementById('close-button');
            closeButton.addEventListener('click', function(e) {
                var self = this;
                e.preventDefault();
                e = e || window.event;
                self.closeIframe();
            }.bind(self), false);

            // Add listeners to all inputs on shipping and billing panels
            var shippingInputs = [];
            var billingInputs = [];

            if (self._domPanels.shipping) {
                shippingInputs = self._domPanels.shipping.querySelectorAll('input[type=text]');
                shippingInputs = Array.prototype.slice.call(shippingInputs);
            }
            if (self._domPanels.billing) {
                billingInputs = self._domPanels.billing.querySelectorAll('input[type=text]');
                billingInputs = Array.prototype.slice.call(billingInputs);
            }

            var inputs = shippingInputs.concat(billingInputs);

            for (var i = 0; i < inputs.length; i++) {
                inputs[i].addEventListener('keyup', self.updateAddresses.bind(self), false);
            }

            // listen for dialog open event for analytics
            window.addEventListener('message', function(event) {
                // Do we trust the sender of this message?
                var origin = event.origin || event.originalEvent.origin;
                if (origin !== self.config.parentDomain) {
                    return;
                }

                var obj = JSON.parse(event.data);
                var type = obj.type;
                var detail = obj.detail;

                if (type === 'beanstream_openPayform' && 'payform.beanstream.com' === document.domain) {

                    window.mixpanel.track('Form opened', {
                            'guid': self.config.guid,
                            'domain': self.config.parentDomain,
                            'currency': self.config.currency,
                            'amount': self.config.amount,
                            'billing': self.config.billing,
                            'shipping': self.config.shipping,
                            'primaryColor': self.config.primaryColor
                        });
                }
            });

        },
        onPreviousPanelClick: function(e) {
            e = e || window.event;
            e.preventDefault();
            var self = this;

            if (self.isDescendant(self._domPanels.billing, e.target)) {
                self.previousPanel.notify(self.panels.billing.name);
            } else if (self.isDescendant(self._domPanels.card, e.target)) {
                self.previousPanel.notify(self.panels.card.name);
            }
        },
        updateAddresses: function(e) {
            var self = this;
            e = e || window.event;
            var blob = {};

            // get all address fields in panel
            if (self.isDescendant(self._domPanels.shipping, e.target)) {
                var inputs = self._domPanels.shipping.querySelectorAll('input[type=text]');
                for (var i = 0; i < inputs.length; i++) {
                    var key = inputs[i].getAttribute('name');
                    blob[key] = inputs[i].value;
                }
                self._model.setShippingAddress(blob);

                if (self._model.getAddressSync()) {
                    self._model.setBillingAddress(blob);
                }

            } else {
                var inputs = self._domPanels.billing.querySelectorAll('input[type=text]');
                for (var i = 0; i < inputs.length; i++) {
                    var key = inputs[i].getAttribute('name');
                    blob[key] = inputs[i].value;
                }
                self._model.setBillingAddress(blob);
            }
        },
        closeIframe: function() {
            var self = this;
            window.parent.postMessage('{"type":"beanstream_closePayform", "detail":""}', self.config.parentDomain);
            location.reload();
        },
        attachPayfieldsListeners: function() {
            var self = this;
            //toDo: listen on form
            //document.addEventListener('beanstream_payfields_loaded', this.addStylingToPayfields.bind(self));
            //document.addEventListener('beanstream_payfields_tokenUpdated', this.onTokenUpdated.bind(self));

            self.script.addEventListener('load', this.addStylingToPayfields.bind(self));
            document.addEventListener('beanstream_payfields_tokenUpdated', this.onTokenUpdated.bind(self));

            document.addEventListener('beanstream_payfields_inputValidityChanged',
                this.onCardValidityChanged.bind(self));
            document.addEventListener('beanstream_payfields_cardTypeChanged', this.onCardTypeUpdated.bind(self));
        },
        isDescendant: function(parent, child) {
            var node = child.parentNode;
            while (node != null) {
                if (node == parent) {
                    return true;
                }
                node = node.parentNode;
            }

            return false;
        },
        onTokenUpdated: function(e) {
            var self = this;
            self._model.setPayfieldsResponse(e.eventDetail);

            var blob = {};
            blob.code = e.eventDetail.token;
            blob.name = self._domPanels.card.querySelector('input[name="name"]').value;
            blob.email = self._domPanels.card.querySelector('input[name="email"]').value;
            self._model.setCardInfo(blob);

            if ('payform.beanstream.com' === document.domain) {

                window.mixpanel.track('Form completed', {
                    'success': e.eventDetail.success,
                    'error-code': e.eventDetail.code,
                    'error-message': e.eventDetail.message
                });
            }

            // ensure processign screen is displayed for min 3 seconds
            if (!(self._model.getDelayProcessing() === 'true')) {
                self.tokenUpdated.notify();
            } else {
                window.setInterval(function() {
                    if (!(self._model.getDelayProcessing() === 'true')) {
                        self.tokenUpdated.notify();
                    }
                }, 500);
            }
        },
        onCardTypeUpdated: function(e) {
            var self = this;
            self.cardType  = e.eventDetail.cardType;
        },
        onCardValidityChanged: function(e) {
            var self = this;
            self._model.setCardErrors(e.eventDetail);
            self.errorsUpdated.notify();

            if (e.eventDetail.isValid) {
                self.cardInputs[e.eventDetail.fieldType].parentNode.classList.remove('invalid');
            } else {
                self.cardInputs[e.eventDetail.fieldType].parentNode.classList.add('invalid');
            }
        },

        addStylingToPayfields: function() {
            var self = this;
            var cardPanel = document.getElementById('card_panel');
            var inputs = cardPanel.getElementsByTagName('input');
            self.cardInputs = {};
            // get placehokders - check if input is child
            // isDescendant

            var numberPlaceholder = document.querySelector('[data-beanstream-target="ccNumber_input"]');
            var cvvPlaceholder = document.querySelector('[data-beanstream-target="ccCvv_input"]');
            var expiryPlaceholder = document.querySelector('[data-beanstream-target="ccExp_input"]');

            for (var i = 0; i < inputs.length; i++) {
                inputs[i].classList.add('u-full-width');

                if (self.isDescendant(numberPlaceholder, inputs[i])) {
                    self.cardInputs.number = inputs[i];
                    inputs[i].id = 'card_number';
                    inputs[i].placeholder = 'card number';

                } else if (self.isDescendant(expiryPlaceholder, inputs[i])) {
                    self.cardInputs.expiry = inputs[i];
                    inputs[i].classList.add('no-border-right');
                    inputs[i].id = 'card_expiry';
                    inputs[i].placeholder = 'expiry mm/yyyy';
                } else if (self.isDescendant(cvvPlaceholder, inputs[i])) {
                    self.cardInputs.cvv = inputs[i];
                    inputs[i].id = 'card_cvv';
                    inputs[i].placeholder = 'cvv';

                    inputs[i].addEventListener('focus', function() {
                        var self = this;
                        var cvvPrompt = self._domPanels.card.querySelector('#cvcPrompt');

                        if (self.cardType === 'amex') {
                            cvvPrompt.innerHTML =
                                '<div class="text">4 digits above card #<br> on front of your card</div>' +
                                '<img src="https://downloads.beanstream.com/images/payform/cvc_hint_color_amex.png"/>';
                        } else {
                            cvvPrompt.innerHTML =
                                '<div class="text">The last 3 digits on<br> the back of your card</div>' +
                                '<img src="https://downloads.beanstream.com/images/payform/cvc_hint_color.png"/>';
                        }

                        cvvPrompt.classList.remove('hidden');
                    }.bind(self));
                    inputs[i].addEventListener('blur', function() {
                        var self = this;
                        var cvvPrompt = self._domPanels.card.querySelector('#cvcPrompt');
                        cvvPrompt.classList.add('hidden');
                    }.bind(self));
                }
            }
            self.addFocusListeners();
        },
        addFocusListeners: function() {
            // Add focus/blur listeners to all inputs
            var inputs = document.querySelectorAll('input[type=text]');
            for (var i = 0; i < inputs.length; i++) {
                inputs[i].addEventListener('focus', function(e) {
                    e.target.parentNode.classList.add('focused');
                }, false);
                inputs[i].addEventListener('blur', function(e) {
                    e.target.parentNode.classList.remove('focused');
                }, false);
            }
        },
        createDocFrag: function(htmlStr) {
            // http://stackoverflow.com/questions/814564/inserting-html-elements-with-javascript
            var frag = document.createDocumentFragment();
            var temp = document.createElement('div');
            temp.innerHTML = htmlStr;
            while (temp.firstChild) {
                frag.appendChild(temp.firstChild);
            }
            return frag;
        },
        validateFields: function(panel) {
            var self = this;
            var inputs = self._domPanels[panel].getElementsByTagName('input');
            var errors = [];

            for (var i = 0; i < inputs.length; i++) {
                var name = '';
                if (inputs[i].attributes.name) {
                    name = inputs[i].attributes.name.value;
                }
                switch (name) {
                    case 'name':
                        var exp = '^[a-zA-Z]+(?:(?:\\\s+|-)[a-zA-Z]+)*$';
                        self.regExValidate(inputs[i], exp, 'Please enter your full name.', errors);
                        break;
                    case 'city':
                        var exp = '^[a-zA-Z]+(?:(?:\\\s+|-)[a-zA-Z]+)*$';
                        self.regExValidate(inputs[i], exp, 'Please enter a valid city.', errors);
                        break;
                    case 'province':
                        var exp = '^[a-zA-Z]+(?:(?:\\\s+|-)[a-zA-Z]+)*$';
                        self.regExValidate(inputs[i], exp, 'Please enter a valid state.', errors);
                        break;
                    case 'country':
                        var exp = '^[a-zA-Z]+(?:(?:\\\s+|-)[a-zA-Z]+)*$';
                        self.regExValidate(inputs[i], exp, 'Please enter a valid country.', errors);
                        break;
                    case 'email':
                        var exp =   '^(([^<>()\\[\\]\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\.,;:\\s@"]+)*)|' +
                                    '(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}])|' +
                                    '(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$';

                        self.regExValidate(inputs[i], exp, 'Please enter a valid email address.', errors);
                        break;
                    default:
                        if (!inputs[i].value.length) {
                            self.addErrorClass(inputs[i], true);
                            var errMsg = 'Please fill all fields.';
                            if (errors.indexOf(errMsg) === -1) {
                                errors.push(errMsg);
                            }
                        } else {
                            self.addErrorClass(inputs[i], false);
                        }
                }
            }

            self._model.setNonCardErrors(errors);
            self.errorsUpdated.notify();
        },
        addErrorClass: function(element, isError) {
            if (isError) {
                element.classList.add('beanstream_invalid');
                element.parentNode.classList.add('invalid');
            } else {
                // Do not remove class for Payfields fields
                if (!element.hasAttribute('data-beanstream-id')) {
                    element.classList.remove('beanstream_invalid');
                    element.parentNode.classList.remove('invalid');
                }
            }
        },
        regExValidate: function(el, exp, errMsg, errors) {
            var self = this;
            var re = new RegExp(exp);

            if (!el.value.length) {
                self.addErrorClass(el, true);
                var errMsg = 'Please fill all fields.';
                if (errors.indexOf(errMsg) === -1) {
                    errors.push(errMsg);
                }
            } else if (!re.test(el.value) || el.value.length < 2) {
                self.addErrorClass(el, true);
                errors.push(errMsg);
            } else {
                self.addErrorClass(el, false);
            }
        }

    };

    // Export to window
    window.beanstream = window.beanstream || {};
    window.beanstream.payform = window.beanstream.payform || {};
    window.beanstream.payform.FormView = FormView;
})(window);
