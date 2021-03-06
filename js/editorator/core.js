/**
 * Created by AlexanderC on 10/31/13.
 */

(function ($) {
    //=============== init custom exceptions ================//
    function SomeDataExpectedException(message) {
        this.message = message || "Some data is expected here";
        console.log(this.message);
    }
    SomeDataExpectedException.prototype = new Error();
    SomeDataExpectedException.prototype.constructor = SomeDataExpectedException;

    function NotEnoughArgumentsException(message) {
        this.message = message || "Not enough arguments provided";
        console.log(this.message);
    }
    NotEnoughArgumentsException.prototype = new Error();
    NotEnoughArgumentsException.prototype.constructor = NotEnoughArgumentsException;

    function ElementNotFoundException(message) {
        this.message = message || "Missing required element";
        console.log(this.message);
    }
    ElementNotFoundException.prototype = new Error();
    ElementNotFoundException.prototype.constructor = ElementNotFoundException;

    function RuntimeException(message) {
        this.message = message || "Runtime Exception";
        console.log(this.message);
    }
    RuntimeException.prototype = new Error();
    RuntimeException.prototype.constructor = RuntimeException;

    function InvalidArgumentException(message) {
        this.message = message || "Invalid argument provided";
        console.log(this.message);
    }
    InvalidArgumentException.prototype = new Error();
    InvalidArgumentException.prototype.constructor = InvalidArgumentException;
    //=============== end init custom exceptions ================//

    /**
     * Options used by the plugin
     *
     * @type {{nl2br: boolean, authUrl: string, authDataType: string, authCallback: Function, pushUrl: string, pushDataType: string, pushPostDataKey: string, pushCallback: Function, pullUrl: string, pullPostDataKey: string, defaultErrorCallback: undefined, editableSelector: string, activePlaceholderClass: string, placeholderTpl: string, placeholderTextareaCss: {padding: number, border: string}, idDataKey: string}}
     */
    var opt = {
        nl2br: true,
        authUrl: 'auth.php',
        authDataType: 'json',
        authCallback: function(data) {
            try {
                return !!data.ok;
            } catch (e) { return false; }
        },
        pushUrl: 'push.php',
        pushDataType: 'json',
        pushPostDataKey: 'items',
        pushCallback: function(data) {
            try {
                if(data.ok) {
                    alert("Changes were successfully saved.");
                } else {
                    alert("An Error Occured. Please try later...");
                }
            } catch (e) { return false; }
        },
        pullUrl: "pull.php",
        pullPostDataKey: 'item-id',
        defaultErrorCallback: undefined,
        editableSelector: '.edt-editable',
        activePlaceholderClass: 'edt-active-plh',
        placeholderTpl: "<textarea class='%class%'></textarea>",
        placeholderTextareaCss: {
            padding: 0,
            border: "1px dotted #009999"
        },
        idDataKey: 'edt-id'
    };

    /**
     * Events triggered
     *
     * @type {{beforeItemContentLoad: string, afterItemContentLoad: string, successItemContentLoad: string, errorItemContentLoad: string, onAuthSuccess: string, onAuthFail: string, onUnload: string, beforeContentPersist: string, afterContentPersist: string, successContentPersist: string, errorContentPersist: string}}
     */
    var events = {
        // load item content
        beforeItemContentLoad: "edt-before-item-content-load",
        afterItemContentLoad: "edt-after-item-content-load",
        successItemContentLoad: "edt-success-item-content-load",
        errorItemContentLoad: "edt-error-item-content-load",
        // authentication
        onAuthSuccess: "edt-auth-success",
        onAuthFail: "edt-auth-fail",
        onUnload: "edt-unload",
        // content persist
        beforeContentPersist: "edt-before-content-persist",
        afterContentPersist: "edt-after-content-persist",
        successContentPersist: "edt-success-content-persist",
        errorContentPersist: "edt-error-content-persist"
    };

    /**
     * Internal variables storage
     *
     * @type {{items: undefined, isAuth: boolean, isEdit: boolean}}
     */
    var storage = {
        items: undefined,
        isAuth: false,
        isEdit: false
    };

    /**
     * Public Methods available by the user
     *
     * @type {{getOptions: Function, init: Function, initEdit: Function, persist: Function, unload: Function}}
     */
    var methods = {
        getOptions: function()
        {
            return opt;
        },
        init: function(options)
        {
            if(storage.items) {
                methods.unload();
            }

            opt = $.extend(opt, options);
            delete options;

            storage.items = $(opt.editableSelector);

            storage.items.each(function() {
                var item = $(this);

                if(!item.data(opt.idDataKey)) {
                    throw new RuntimeException("Unable to find unique identifier in item data");
                }
            });

            internals.init();

            // authenticate user
            internals.call(opt.authUrl, undefined, function(data) {
                if(true === opt.authCallback(data)) {
                    storage.isAuth = true;
                    $(window).trigger(events.onAuthSuccess, [data]);
                } else {
                    storage.isAuth = false;
                    $(window).trigger(events.onAuthFail, [data]);
                }
            }, {
                dataType: opt.authDataType
            });

            return storage.items;
        },
        initEdit: function(options)
        {
            if(storage.isEdit) {
                throw new RuntimeException("Already in edit mode");
            }

            if(!storage.items) {
                methods.init(options);
            }

            if(storage.isAuth) {
                internals.initEdit();
            } else {
                throw new RuntimeException("Access Denied. User was not authenticated");
            }

            storage.isEdit = true;

            return storage.items;
        },
        persist: function()
        {
            if(!storage.items) {
                throw new RuntimeException("You must init this first");
            } else if(!storage.isEdit) {
                throw new RuntimeException("You must init edit mode first");
            }

            $(window).trigger(events.beforeContentPersist, [storage.items]);

            var data = {};

            storage.items.each(function() {
                var item = $(this);

                data[item.data(opt.idDataKey)] = item.find('.' + opt.activePlaceholderClass).val();

                if(opt.nl2br) {
                    data[item.data(opt.idDataKey)] = data[item.data(opt.idDataKey)].replace(/\n/g, "<br/>");
                }
            });

            var postData = {};
            postData[opt.pushPostDataKey] = data;

            internals.call(opt.pushUrl, postData, function(data) {
                $(window).trigger(events.successContentPersist, [storage.items, data]);

                if(helpers.isFunction(opt.pushCallback)) {
                    opt.pushCallback(data);
                }
            }, {
                complete: function(jqXHR, textStatus)
                {
                    $(window).trigger(events.afterContentPersist, [storage.items, jqXHR, textStatus]);
                },
                error: function(jqXHR, textStatus, errorThrown)
                {
                    $(window).trigger(events.errorContentPersist, [storage.items, jqXHR, textStatus, errorThrown]);
                },
                type: "POST",
                dataType: opt.pushDataType
            });
        },
        unload: function(all)
        {
            all = (undefined === all) ? true : !!all;

            if(!storage.items) {
                throw new RuntimeException("You must init this first");
            }

            if(storage.isEdit) {
                storage.items.each(function() {
                    var item = $(this);
                    var content = item.find('.' + opt.activePlaceholderClass).val();

                    if(opt.nl2br) {
                        content = content.replace(/\n/g, "<br/>");
                    }

                    item.html(content);
                });
            }

            $(window).trigger(events.onUnload, [storage.items]);
            storage.isEdit = false;

            if(all) {
                storage.items = undefined;
                storage.isAuth = false;
            }
        }
    };

    /**
     * Internal methods used inside the plugin
     *
     * @type {{init: Function, initItem: Function, initEdit: Function, initEditableItem: Function, call: Function}}
     */
    var internals = {
        init: function()
        {
            storage.items.each(function() {
                internals.initItem($(this));
            });
        },
        initItem: function(item)
        {
            $(window).trigger(events.beforeItemContentLoad, [item]);

            var data = {};
            data[opt.pullPostDataKey] = item.data(opt.idDataKey);

            internals.call(opt.pullUrl, data, function(data) {
                $(window).trigger(events.successItemContentLoad, [item, data]);

                item.html(data);
            }, {
                complete: function(jqXHR, textStatus)
                {
                    $(window).trigger(events.afterItemContentLoad, [item, jqXHR, textStatus]);
                },
                error: function(jqXHR, textStatus, errorThrown)
                {
                    $(window).trigger(events.errorItemContentLoad, [item, jqXHR, textStatus, errorThrown]);
                },
                dataType: "text"
            });
        },
        initEdit: function()
        {
            storage.items.each(function() {
                internals.initEditableItem($(this));
            });
        },
        initEditableItem: function(item) {
            var itemPaddingTB = parseInt(item.css("padding-top").replace("px", ""))
                + parseInt(item.css("padding-bottom").replace("px", ""));

            var itemParameters = {
                width: helpers.contentWidth(item),
                height: item[0].scrollHeight - itemPaddingTB,
                "font-style": item.css('font-style'),
                "font-family": item.css('font-family'),
                "font-size": item.css('font-size'),
                "font-weight": item.css('font-weight'),
                "font-variant": item.css('font-variant'),
                "font-stretch": item.css('font-stretch'),
                "text-justify": item.css('text-justify')
            };
            var plh = $(opt.placeholderTpl.replace("%class%", opt.activePlaceholderClass));
            plh.css($.extend(itemParameters, opt.placeholderTextareaCss));

            var content = item.html();
            plh.html(helpers.prepareText(content));
            item.html(plh);
        },
        call: function(url, data, callback, options)
        {
            if(!url) {
                throw new InvalidArgumentException("Url must be provided");
            } else if(!helpers.isFunction(callback)) {
                throw new InvalidArgumentException("Callback must be a valid callback");
            }

            var ajaxOptions = {
                'url': url,
                'dataType': 'json',
                'data': data,
                async: true,
                success: callback,
                error: opt.defaultErrorCallback || function(jqXHR, textStatus, errorThrown)
                {
                    console.log(errorThrown);
                }
            };

            $.ajax($.extend(ajaxOptions, options));
        }
    };

    /**
     * Basic Helpers
     *
     * @type {{isFunction: Function, contentWidth: Function, prepareText: Function}}
     */
    var helpers = {
        isFunction: function(fn)
        {
            return fn instanceof Function;
        },
        contentWidth: function(item)
        {
            var sensor = $('<div />').css({margin: 0, padding: 0});
            item.append(sensor);
            var width = sensor.width();
            sensor.remove();
            return width;
        },
        prepareText: function(content)
        {
            var result = $.trim(content).replace(/\s+/g, ' ');

            if(opt.nl2br) {
                result = result.replace(/<\s*br\s*\/?\s*>/gi, "\n");
            }

            return result;
        }
    };

    /**
     * Init method of the plugin
     *
     * @param method
     * @returns {*}
     */
    $.editorator = function (method) {
        // Method calling logic
        if (methods[method]) {
            return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.editorator');
        }
    };
})(jQuery);
