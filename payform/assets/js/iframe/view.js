
(function(window) {
    'use strict';

    /**
     * The View presents the model and notifies the Controller of UI events.
     */
    function IframeView(model, template) {
        var self = this;
        self._model = model;
        this._template = template;
    }

    IframeView.prototype = {

        init: function() {
            var self = this;
            self.cacheDom();
        },
        render: function(path, config) {
            var self = this;
            var template = self._template.show('iframe', {'path': path, 'config': config});

            if (document.querySelector('button[data-beanstream]') === null) {
                template = template + self._template.show('button', {});
            }

            var frag = self.createDocFrag(template);
            self.form.appendChild(frag);
        },
        cacheDom: function() {
            // http://stackoverflow.com/a/22745553
            // there may be multiple 'buy' buttons in a page, get ref to current button
            var scripts = document.getElementsByTagName('script');
            this.script = scripts[ scripts.length - 1 ];
            this.form = this.script.parentNode;
            this.head = document.getElementsByTagName('head')[0];
            this.body = document.getElementsByTagName('body')[0];

            var urlArray = this.script.src.split('/');
            this.host = urlArray[0] + '//' + urlArray[2];
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
        readAttributes: function() {
            var attributes = {};
            attributes.image = this.script.getAttribute('data-image');
            attributes.name = this.script.getAttribute('data-name');
            attributes.description = this.script.getAttribute('data-description');
            attributes.amount = this.script.getAttribute('data-amount');
            attributes.billingAddress = this.script.getAttribute('data-billingAddress');
            attributes.shippingAddress = this.script.getAttribute('data-shippingAddress');
            attributes.currency = this.script.getAttribute('data-currency');
            attributes.primaryColor = this.script.getAttribute('data-primaryColor');
            attributes.parentDomain =
                location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '');
            var version = location.pathname.split('/')[1];
            attributes.host = this.host +  '/' + version;
            return attributes;
        },

        attachListeners: function() {
            var self = this;
            if (!this.button) {
                //data-beanstream
                this.button = document.querySelector('button[data-beanstream]');
            }

            if (!this.iframe) {
                this.iframe = this.form.getElementsByTagName('iframe')[0];
            }

            this.button.addEventListener('click', function(e) {
                e.preventDefault();
                e = e || window.event;
                this.iframe.parentNode.style.display = 'block';

                this.iframe.contentWindow.postMessage(
                    '{"type":"beanstream_openPayform", "detail":""}', this.host);
            }.bind(self), false);

            window.addEventListener('message', function(event) {

                // Ensure postmessage came from expected source
                var origin = event.origin || event.originalEvent.origin;
                if (origin !== this.host) {
                    return;
                }

                var obj = JSON.parse(event.data);
                var type = obj.type;
                var detail = obj.detail;

                if (type === 'beanstream_closePayform') {
                    this.iframe.parentNode.style.display = 'none';
                } else if (type === 'beanstream_toknizationForm_complete') {

                    if (detail.billingAddress) {
                        var billing = detail.billingAddress;
                        for (var key in billing) {

                            if (billing.hasOwnProperty(key)) {
                                var name = 'billingAddress_' + key;
                                this.appendValue(name, billing[key]);
                            }
                        }
                    }
                    if (detail.shippingAddress) {
                        var shipping = detail.shippingAddress;
                        for (var key in shipping) {
                            if (shipping.hasOwnProperty(key)) {
                                var name = 'shippingAddress_' + key;
                                this.appendValue(name, billing[key]);
                            }
                        }
                    }
                    if (detail.cardInfo) {
                        var card = detail.cardInfo;
                        for (var key in card) {
                            if (card.hasOwnProperty(key)) {
                                var name = 'cardInfo_' + key;
                                this.appendValue(name, card[key]);
                            }
                        }
                    }

                    // call submit form if configured
                    var submitForm = this.script.getAttribute('data-submitForm');
                    if (!(submitForm && submitForm.toLowerCase() === 'false')) {
                        this.iframe.parentNode.parentNode.submit();
                    }

                    beanstream.Helper.fireEvent('beanstream_payform_complete', detail, window.parent.document);
                }
            }.bind(self), false);
        },

        appendValue: function(name, value) {
            var input = this.form.querySelector('input[name=' + name + ']');

            if (input) {
                input.value = value;
            }
        }
    };

    // Export to window
    window.beanstream = window.beanstream || {};
    window.beanstream.IframeView = IframeView;
})(window);
