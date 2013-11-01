/**
 * Created by AlexanderC on 11/1/13.
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
     * Options use internally
     *
     * @type {{imageSizeDataKey: string, editableSelector: string, pushUrl: string, pushPostDataKey: string, pushPostNameKey: string, pushPostImgSizeKey: string, pushCallback: Function, tplFormClass: string, editFormTpl: string, editCss: {display: string}}}
     */
    var opt = {
        imageSizeDataKey: 'imn-size',
        editableSelector: 'img.imn-editable',
        pushUrl: 'pushImage.php',
        pushPostDataKey: 'image',
        pushPostNameKey: 'name',
        pushPostImgSizeKey: 'size',
        pushCallback: function(image, data)
        {
            image.attr('src', data.src);
        },
        tplFormClass: "imn-tpl-image",
        editFormTpl: "<input type='file' class='%class%'/>",
        editCss: {
            display: "none"
        }
    };

    /**
     * Events triggered
     *
     * @type {{beforeItemContentLoad: string, afterItemContentLoad: string, successItemContentLoad: string, errorItemContentLoad: string, onAuthSuccess: string, onAuthFail: string, onUnload: string, beforeContentPersist: string, afterContentPersist: string, successContentPersist: string, errorContentPersist: string}}
     */
    var events = {
        // load item content
        beforeItemContentLoad: "imn-before-item-content-load",
        afterItemContentLoad: "imn-after-item-content-load",
        successItemContentLoad: "imn-success-item-content-load",
        errorItemContentLoad: "imn-error-item-content-load",
        // authentication
        onAuthSuccess: "imn-auth-success",
        onAuthFail: "imn-auth-fail",
        onUnload: "imn-unload",
        // content persist
        beforeContentPersist: "imn-before-content-persist",
        afterContentPersist: "imn-after-content-persist",
        successContentPersist: "imn-success-content-persist",
        errorContentPersist: "imn-error-content-persist"
    };

    /**
     * Internal variables storage
     *
     * @type {{items: undefined, isAuth: boolean, isEdit: boolean, coreOptions: undefined}}
     */
    var storage = {
        items: undefined,
        isAuth: false,
        isEdit: false,
        coreOptions: undefined
    };

    /**
     * Public method called by user
     *
     * @type {{init: Function, initEdit: Function, persist: Function, unload: Function}}
     */
    var methods = {
        init: function(options)
        {
            if(!$.editorator) {
                throw new RuntimeException("Editorator should be instantiated first");
            }

            if(storage.items) {
                methods.unload();
            }

            opt = $.extend(opt, options);
            delete options;

            storage.items = $(opt.editableSelector);
            storage.coreOptions = $.editorator('getOptions');

            storage.items.each(function() {
                var item = $(this);

                if(!item.data(storage.coreOptions.idDataKey)) {
                    throw new RuntimeException("Unable to find unique identifier in item data");
                }
            });

            /**
             * bind this with core auth mechanism
             */
            $(window).on('edt-auth-success', function(data) {
                storage.isAuth = true;
                $(window).trigger(events.onAuthSuccess, [data]);
            });

            $(window).on('edt-auth-fail', function(data) {
                storage.isAuth = false;
                $(window).trigger(events.onAuthFail, [data]);
            });

            internals.init();

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

                data[item.data(storage.coreOptions.idDataKey)] = item.attr('src');
            });

            var postData = {};
            postData[storage.coreOptions.pushPostDataKey] = data;

            internals.call(storage.coreOptions.pushUrl, postData, function(data) {
                $(window).trigger(events.successContentPersist, [storage.items, data]);

                if(helpers.isFunction(storage.coreOptions.pushCallback)) {
                    storage.coreOptions.pushCallback(data);
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
                dataType: storage.coreOptions.pushDataType
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
                    item.unbind("click");
                    item.find("input." + opt.tplFormClass).remove();
                });
            }

            $(window).trigger(events.onUnload, [storage.items]);
            storage.isEdit = false;

            if(all) {
                storage.items = undefined;
                storage.isAuth = false;
                storage.coreOptions = undefined;
            }
        }
    };

    /**
     * Internal methods used
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
            data[storage.coreOptions.pullPostDataKey] = item.data(storage.coreOptions.idDataKey);

            internals.call(storage.coreOptions.pullUrl, data, function(data) {
                $(window).trigger(events.successItemContentLoad, [item, data]);

                item.attr("src", $.trim(data));
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
            var plh = $(opt.editFormTpl.replace("%class%", opt.tplFormClass));
            plh.css(opt.editCss);

            item.append(plh);

            item.bind("click", function() {
                $(this).find("input." + opt.tplFormClass)[0].click();
            });

            item.find("input." + opt.tplFormClass).bind("change", function() {
                var input = $(this);

                var file = input[0].files[0];
                var reader = new FileReader();

                reader.readAsDataURL(file);
                reader.onload = function(event)
                {
                    var result = event.target.result;
                    var name = file.name;

                    var data = {};
                    data[opt.pushPostNameKey] = name;
                    data[opt.pushPostImgSizeKey] = item.data(opt.imageSizeDataKey) || {
                        width: item.width(),
                        height: item.height()
                    };
                    data[opt.pushPostDataKey] = result;

                    internals.call(opt.pushUrl, data, function(data) {
                        $(window).trigger(events.successContentPersist, [storage.items, data]);

                        if(helpers.isFunction(opt.pushCallback)) {
                            opt.pushCallback(item, data);
                        }
                    }, {
                        complete: function(jqXHR, textStatus)
                        {
                            $(window).trigger(events.afterContentPersist, [item, jqXHR, textStatus]);
                        },
                        error: function(jqXHR, textStatus, errorThrown)
                        {
                            $(window).trigger(events.errorContentPersist, [item, jqXHR, textStatus, errorThrown]);
                        },
                        type: "POST",
                        dataType: "json"
                    });
                };
            });
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
                error: storage.coreOptions.defaultErrorCallback || function(jqXHR, textStatus, errorThrown)
                {
                    console.log(errorThrown);
                }
            };

            $.ajax($.extend(ajaxOptions, options));
        }
    };

    /**
     * Some helpers
     *
     * @type {{isFunction: Function}}
     */
    var helpers = {
        isFunction: function(fn)
        {
            return fn instanceof Function;
        }
    };

    /**
     * Init method of the plugin
     *
     * @param method
     * @returns {*}
     */
    $.imaginator = function (method) {
        // Method calling logic
        if (methods[method]) {
            return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.imaginator');
        }
    };
})(jQuery);
