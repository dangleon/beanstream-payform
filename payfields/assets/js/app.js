(function(window) {
    'use strict';

    /**
    * Entry point for the Payfields app
    * Functionality:
    * 1. Injects card fields into DOM
    * 2. OnSubmit tokenises field content, clears them and appends hidden field to form
    * 3. Fires 'beanstream_tokenUpdated' event to document if 'data-submitForm' attribute is set to false
    */

    console.log('Starting Beanstream Payfields...');

    function Form() {
        var self = this;

        if (document.documentMode && document.documentMode <= 9) {
            console.log('ERROR: Unsupported browser. Payform only supports Internet Explorer versions 10+.');
            return;
        }

        // Work around for browsers that do not support document.currentScript
        // source: http://www.2ality.com/2014/05/current-script.html
        // This will not work for if script is loaded async, so we cannot support async in IE8 or 9
        var currentScript = document.currentScript || (function() {
            var scriptId = document.getElementById('payfields-script');
            if (scriptId) {
                return scriptId;
            } else {
                console.log('Error:The script tag with beanstream_payfields.js requires id value \'payfields-script\'');
            };
        })();

        self.model = new beanstream.FormModel();
        self.view = new beanstream.FormView(self.model, currentScript);
        self.controller = new beanstream.FormController(self.model, self.view);

        if (currentScript.hasAttribute('async')) {
            self.controller.init();
        } else {
            // toDo: listen to load event rather than binding to window.onload prop (breaking change)

            window.onload = function() {
                self.controller.init();
            };
        }
    };

    var form = new Form();

})(window);
