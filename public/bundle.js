
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
            : ctx.$$scope.ctx;
    }
    function get_slot_changes(definition, ctx, changed, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
            : ctx.$$scope.changed || {};
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        for (const key in attributes) {
            if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key in node) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    /**
     * Derived value store by synchronizing one or more readable stores and
     * applying an aggregation function over its input values.
     * @param {Stores} stores input stores
     * @param {function(Stores=, function(*)=):*}fn function callback that aggregates the values
     * @param {*=}initial_value when used asynchronously
     */
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `string` starts with `search`
     * @param {string} string
     * @param {string} search
     * @return {boolean}
     */
    function startsWith(string, search) {
      return string.substr(0, search.length) === search;
    }

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Add the query to the pathname if a query is given
     * @param {string} pathname
     * @param {string} [query]
     * @return {string}
     */
    function addQuery(pathname, query) {
      return pathname + (query ? `?${query}` : "");
    }

    /**
     * Resolve URIs as though every path is a directory, no files. Relative URIs
     * in the browser can feel awkward because not only can you be "in a directory",
     * you can be "at a file", too. For example:
     *
     *  browserSpecResolve('foo', '/bar/') => /bar/foo
     *  browserSpecResolve('foo', '/bar') => /foo
     *
     * But on the command line of a file system, it's not as complicated. You can't
     * `cd` from a file, only directories. This way, links have to know less about
     * their current path. To go deeper you can do this:
     *
     *  <Link to="deeper"/>
     *  // instead of
     *  <Link to=`{${props.uri}/deeper}`/>
     *
     * Just like `cd`, if you want to go deeper from the command line, you do this:
     *
     *  cd deeper
     *  # not
     *  cd $(pwd)/deeper
     *
     * By treating every path as a directory, linking to relative paths should
     * require less contextual information and (fingers crossed) be more intuitive.
     * @param {string} to
     * @param {string} base
     * @return {string}
     */
    function resolve(to, base) {
      // /foo/bar, /baz/qux => /foo/bar
      if (startsWith(to, "/")) {
        return to;
      }

      const [toPathname, toQuery] = to.split("?");
      const [basePathname] = base.split("?");
      const toSegments = segmentize(toPathname);
      const baseSegments = segmentize(basePathname);

      // ?a=b, /users?b=c => /users?a=b
      if (toSegments[0] === "") {
        return addQuery(basePathname, toQuery);
      }

      // profile, /users/789 => /users/789/profile
      if (!startsWith(toSegments[0], ".")) {
        const pathname = baseSegments.concat(toSegments).join("/");

        return addQuery((basePathname === "/" ? "" : "/") + pathname, toQuery);
      }

      // ./       , /users/123 => /users/123
      // ../      , /users/123 => /users
      // ../..    , /users/123 => /
      // ../../one, /a/b/c/d   => /a/b/one
      // .././one , /a/b/c/d   => /a/b/c/one
      const allSegments = baseSegments.concat(toSegments);
      const segments = [];

      allSegments.forEach(segment => {
        if (segment === "..") {
          segments.pop();
        } else if (segment !== ".") {
          segments.push(segment);
        }
      });

      return addQuery("/" + segments.join("/"), toQuery);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    /* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.12.1 */

    function create_fragment(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $base, $location, $routes;

    	

      let { basepath = "/", url = null } = $$props;

      const locationContext = getContext(LOCATION);
      const routerContext = getContext(ROUTER);

      const routes = writable([]); validate_store(routes, 'routes'); component_subscribe($$self, routes, $$value => { $routes = $$value; $$invalidate('$routes', $routes); });
      const activeRoute = writable(null);
      let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

      // If locationContext is not set, this is the topmost Router in the tree.
      // If the `url` prop is given we force the location to it.
      const location =
        locationContext ||
        writable(url ? { pathname: url } : globalHistory.location); validate_store(location, 'location'); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });

      // If routerContext is set, the routerBase of the parent Router
      // will be the base for this Router's descendants.
      // If routerContext is not set, the path and resolved uri will both
      // have the value of the basepath prop.
      const base = routerContext
        ? routerContext.routerBase
        : writable({
            path: basepath,
            uri: basepath
          }); validate_store(base, 'base'); component_subscribe($$self, base, $$value => { $base = $$value; $$invalidate('$base', $base); });

      const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
        // If there is no activeRoute, the routerBase will be identical to the base.
        if (activeRoute === null) {
          return base;
        }

        const { path: basepath } = base;
        const { route, uri } = activeRoute;
        // Remove the potential /* or /*splatname from
        // the end of the child Routes relative paths.
        const path = route.default ? basepath : route.path.replace(/\*.*$/, "");

        return { path, uri };
      });

      function registerRoute(route) {
        const { path: basepath } = $base;
        let { path } = route;

        // We store the original path in the _path property so we can reuse
        // it when the basepath changes. The only thing that matters is that
        // the route reference is intact, so mutation is fine.
        route._path = path;
        route.path = combinePaths(basepath, path);

        if (typeof window === "undefined") {
          // In SSR we should set the activeRoute immediately if it is a match.
          // If there are more Routes being registered after a match is found,
          // we just skip them.
          if (hasActiveRoute) {
            return;
          }

          const matchingRoute = match(route, $location.pathname);
          if (matchingRoute) {
            activeRoute.set(matchingRoute);
            hasActiveRoute = true;
          }
        } else {
          routes.update(rs => {
            rs.push(route);
            return rs;
          });
        }
      }

      function unregisterRoute(route) {
        routes.update(rs => {
          const index = rs.indexOf(route);
          rs.splice(index, 1);
          return rs;
        });
      }

      if (!locationContext) {
        // The topmost Router in the tree is responsible for updating
        // the location store and supplying it through context.
        onMount(() => {
          const unlisten = globalHistory.listen(history => {
            location.set(history.location);
          });

          return unlisten;
        });

        setContext(LOCATION, location);
      }

      setContext(ROUTER, {
        activeRoute,
        base,
        routerBase,
        registerRoute,
        unregisterRoute
      });

    	const writable_props = ['basepath', 'url'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('basepath' in $$props) $$invalidate('basepath', basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { basepath, url, hasActiveRoute, $base, $location, $routes };
    	};

    	$$self.$inject_state = $$props => {
    		if ('basepath' in $$props) $$invalidate('basepath', basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    		if ('hasActiveRoute' in $$props) hasActiveRoute = $$props.hasActiveRoute;
    		if ('$base' in $$props) base.set($base);
    		if ('$location' in $$props) location.set($location);
    		if ('$routes' in $$props) routes.set($routes);
    	};

    	$$self.$$.update = ($$dirty = { $base: 1, $routes: 1, $location: 1 }) => {
    		if ($$dirty.$base) { {
            const { path: basepath } = $base;
            routes.update(rs => {
              rs.forEach(r => (r.path = combinePaths(basepath, r._path)));
              return rs;
            });
          } }
    		if ($$dirty.$routes || $$dirty.$location) { {
            const bestMatch = pick($routes, $location.pathname);
            activeRoute.set(bestMatch);
          } }
    	};

    	return {
    		basepath,
    		url,
    		routes,
    		location,
    		base,
    		$$slots,
    		$$scope
    	};
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["basepath", "url"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Router", options, id: create_fragment.name });
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.12.1 */

    const get_default_slot_changes = ({ routeParams, $location }) => ({ params: routeParams, location: $location });
    const get_default_slot_context = ({ routeParams, $location }) => ({
    	params: routeParams,
    	location: $location
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block_1,
    		create_else_block
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.component !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}", ctx });
    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && (changed.$$scope || changed.routeParams || changed.$location)) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, get_default_slot_changes),
    					get_slot_context(default_slot_template, ctx, get_default_slot_context)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(43:2) {:else}", ctx });
    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	var switch_instance_anchor, current;

    	var switch_instance_spread_levels = [
    		{ location: ctx.$location },
    		ctx.routeParams,
    		ctx.routeProps
    	];

    	var switch_value = ctx.component;

    	function switch_props(ctx) {
    		let switch_instance_props = {};
    		for (var i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}
    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) switch_instance.$$.fragment.c();
    			switch_instance_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var switch_instance_changes = (changed.$location || changed.routeParams || changed.routeProps) ? get_spread_update(switch_instance_spread_levels, [
    									(changed.$location) && { location: ctx.$location },
    			(changed.routeParams) && get_spread_object(ctx.routeParams),
    			(changed.routeProps) && get_spread_object(ctx.routeProps)
    								]) : {};

    			if (switch_value !== (switch_value = ctx.component)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;
    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});
    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());

    					switch_instance.$$.fragment.c();
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}

    			else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(switch_instance_anchor);
    			}

    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(41:2) {#if component !== null}", ctx });
    	return block;
    }

    function create_fragment$1(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $activeRoute, $location;

    	

      let { path = "", component = null } = $$props;

      const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER); validate_store(activeRoute, 'activeRoute'); component_subscribe($$self, activeRoute, $$value => { $activeRoute = $$value; $$invalidate('$activeRoute', $activeRoute); });
      const location = getContext(LOCATION); validate_store(location, 'location'); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });

      const route = {
        path,
        // If no path prop is given, this Route will act as the default Route
        // that is rendered if no other Route in the Router is a match.
        default: path === ""
      };
      let routeParams = {};
      let routeProps = {};

      registerRoute(route);

      // There is no need to unregister Routes in SSR since it will all be
      // thrown away anyway.
      if (typeof window !== "undefined") {
        onDestroy(() => {
          unregisterRoute(route);
        });
      }

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$new_props) $$invalidate('path', path = $$new_props.path);
    		if ('component' in $$new_props) $$invalidate('component', component = $$new_props.component);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { path, component, routeParams, routeProps, $activeRoute, $location };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$props) $$invalidate('path', path = $$new_props.path);
    		if ('component' in $$props) $$invalidate('component', component = $$new_props.component);
    		if ('routeParams' in $$props) $$invalidate('routeParams', routeParams = $$new_props.routeParams);
    		if ('routeProps' in $$props) $$invalidate('routeProps', routeProps = $$new_props.routeProps);
    		if ('$activeRoute' in $$props) activeRoute.set($activeRoute);
    		if ('$location' in $$props) location.set($location);
    	};

    	$$self.$$.update = ($$dirty = { $activeRoute: 1, $$props: 1 }) => {
    		if ($$dirty.$activeRoute) { if ($activeRoute && $activeRoute.route === route) {
            $$invalidate('routeParams', routeParams = $activeRoute.params);
          } }
    		{
            const { path, component, ...rest } = $$props;
            $$invalidate('routeProps', routeProps = rest);
          }
    	};

    	return {
    		path,
    		component,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["path", "component"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Route", options, id: create_fragment$1.name });
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Link.svelte generated by Svelte v3.12.1 */

    const file = "node_modules/svelte-routing/src/Link.svelte";

    function create_fragment$2(ctx) {
    	var a, current, dispose;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var a_levels = [
    		{ href: ctx.href },
    		{ "aria-current": ctx.ariaCurrent },
    		ctx.props
    	];

    	var a_data = {};
    	for (var i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");

    			if (default_slot) default_slot.c();

    			set_attributes(a, a_data);
    			add_location(a, file, 40, 0, 1249);
    			dispose = listen_dev(a, "click", ctx.onClick);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(a_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(a, get_spread_update(a_levels, [
    				(changed.href) && { href: ctx.href },
    				(changed.ariaCurrent) && { "aria-current": ctx.ariaCurrent },
    				(changed.props) && ctx.props
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $base, $location;

    	

      let { to = "#", replace = false, state = {}, getProps = () => ({}) } = $$props;

      const { base } = getContext(ROUTER); validate_store(base, 'base'); component_subscribe($$self, base, $$value => { $base = $$value; $$invalidate('$base', $base); });
      const location = getContext(LOCATION); validate_store(location, 'location'); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });
      const dispatch = createEventDispatcher();

      let href, isPartiallyCurrent, isCurrent, props;

      function onClick(event) {
        dispatch("click", event);

        if (shouldNavigate(event)) {
          event.preventDefault();
          // Don't push another entry to the history stack when the user
          // clicks on a Link to the page they are currently on.
          const shouldReplace = $location.pathname === href || replace;
          navigate(href, { state, replace: shouldReplace });
        }
      }

    	const writable_props = ['to', 'replace', 'state', 'getProps'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Link> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('to' in $$props) $$invalidate('to', to = $$props.to);
    		if ('replace' in $$props) $$invalidate('replace', replace = $$props.replace);
    		if ('state' in $$props) $$invalidate('state', state = $$props.state);
    		if ('getProps' in $$props) $$invalidate('getProps', getProps = $$props.getProps);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { to, replace, state, getProps, href, isPartiallyCurrent, isCurrent, props, $base, $location, ariaCurrent };
    	};

    	$$self.$inject_state = $$props => {
    		if ('to' in $$props) $$invalidate('to', to = $$props.to);
    		if ('replace' in $$props) $$invalidate('replace', replace = $$props.replace);
    		if ('state' in $$props) $$invalidate('state', state = $$props.state);
    		if ('getProps' in $$props) $$invalidate('getProps', getProps = $$props.getProps);
    		if ('href' in $$props) $$invalidate('href', href = $$props.href);
    		if ('isPartiallyCurrent' in $$props) $$invalidate('isPartiallyCurrent', isPartiallyCurrent = $$props.isPartiallyCurrent);
    		if ('isCurrent' in $$props) $$invalidate('isCurrent', isCurrent = $$props.isCurrent);
    		if ('props' in $$props) $$invalidate('props', props = $$props.props);
    		if ('$base' in $$props) base.set($base);
    		if ('$location' in $$props) location.set($location);
    		if ('ariaCurrent' in $$props) $$invalidate('ariaCurrent', ariaCurrent = $$props.ariaCurrent);
    	};

    	let ariaCurrent;

    	$$self.$$.update = ($$dirty = { to: 1, $base: 1, $location: 1, href: 1, isCurrent: 1, getProps: 1, isPartiallyCurrent: 1 }) => {
    		if ($$dirty.to || $$dirty.$base) { $$invalidate('href', href = to === "/" ? $base.uri : resolve(to, $base.uri)); }
    		if ($$dirty.$location || $$dirty.href) { $$invalidate('isPartiallyCurrent', isPartiallyCurrent = startsWith($location.pathname, href)); }
    		if ($$dirty.href || $$dirty.$location) { $$invalidate('isCurrent', isCurrent = href === $location.pathname); }
    		if ($$dirty.isCurrent) { $$invalidate('ariaCurrent', ariaCurrent = isCurrent ? "page" : undefined); }
    		if ($$dirty.getProps || $$dirty.$location || $$dirty.href || $$dirty.isPartiallyCurrent || $$dirty.isCurrent) { $$invalidate('props', props = getProps({
            location: $location,
            href,
            isPartiallyCurrent,
            isCurrent
          })); }
    	};

    	return {
    		to,
    		replace,
    		state,
    		getProps,
    		base,
    		location,
    		href,
    		props,
    		onClick,
    		ariaCurrent,
    		$$slots,
    		$$scope
    	};
    }

    class Link extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["to", "replace", "state", "getProps"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Link", options, id: create_fragment$2.name });
    	}

    	get to() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set to(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get replace() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set replace(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get state() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set state(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getProps() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getProps(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/routes/LandingRoute.svelte generated by Svelte v3.12.1 */

    const file$1 = "src/routes/LandingRoute.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.message = list[i];
    	return child_ctx;
    }

    // (92:4) {#each messages as message}
    function create_each_block(ctx) {
    	var div, t_value = ctx.message + "", t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "message svelte-qb4jxc");
    			add_location(div, file$1, 92, 6, 1838);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(92:4) {#each messages as message}", ctx });
    	return block;
    }

    function create_fragment$3(ctx) {
    	var div1, p, t0, br0, t1, br1, t2, br2, t3, span, t5, button, t7, img, t8, div0, dispose;

    	let each_value = ctx.messages;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			p = element("p");
    			t0 = text("Участвуй\n    ");
    			br0 = element("br");
    			t1 = text("\n    в переписи населения -\n    ");
    			br1 = element("br");
    			t2 = text("\n    узнай, насколько\n    ");
    			br2 = element("br");
    			t3 = space();
    			span = element("span");
    			span.textContent = "ты уникален";
    			t5 = space();
    			button = element("button");
    			button.textContent = "Участвовать в опросе";
    			t7 = space();
    			img = element("img");
    			t8 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			add_location(br0, file$1, 76, 4, 1414);
    			add_location(br1, file$1, 78, 4, 1452);
    			add_location(br2, file$1, 80, 4, 1484);
    			attr_dev(span, "class", "pink");
    			add_location(span, file$1, 81, 4, 1495);
    			attr_dev(p, "class", "text svelte-qb4jxc");
    			add_location(p, file$1, 74, 2, 1380);
    			attr_dev(button, "class", "be-apart svelte-qb4jxc");
    			attr_dev(button, "type", "button");
    			add_location(button, file$1, 84, 2, 1543);
    			attr_dev(img, "src", "./images/guys.png");
    			attr_dev(img, "alt", "guys");
    			attr_dev(img, "width", "440px");
    			attr_dev(img, "height", "440px");
    			attr_dev(img, "class", "svelte-qb4jxc");
    			add_location(img, file$1, 88, 2, 1702);
    			attr_dev(div0, "class", "messages svelte-qb4jxc");
    			add_location(div0, file$1, 90, 2, 1777);
    			attr_dev(div1, "class", "container svelte-qb4jxc");
    			add_location(div1, file$1, 72, 0, 1353);
    			dispose = listen_dev(button, "click", click_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, p);
    			append_dev(p, t0);
    			append_dev(p, br0);
    			append_dev(p, t1);
    			append_dev(p, br1);
    			append_dev(p, t2);
    			append_dev(p, br2);
    			append_dev(p, t3);
    			append_dev(p, span);
    			append_dev(div1, t5);
    			append_dev(div1, button);
    			append_dev(div1, t7);
    			append_dev(div1, img);
    			append_dev(div1, t8);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}
    		},

    		p: function update(changed, ctx) {
    			if (changed.messages) {
    				each_value = ctx.messages;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div1);
    			}

    			destroy_each(each_blocks, detaching);

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    const click_handler = () => window.location.replace('https://kazan-poll.firebaseapp.com');

    function instance$3($$self) {
    	const messages = [
        'Проходите опрос и получайте гарантированные подарки от наших спонсоров',
        'После подведения итогов переписки Вас будет возможность просмотра результатов',
      ];

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { messages };
    }

    class LandingRoute extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "LandingRoute", options, id: create_fragment$3.name });
    	}
    }

    let pending = writable(false);

    /* src/common/Widget.svelte generated by Svelte v3.12.1 */

    const file$2 = "src/common/Widget.svelte";

    const get_marks_slot_changes = () => ({});
    const get_marks_slot_context = () => ({});

    const get_chart_slot_changes = () => ({});
    const get_chart_slot_context = () => ({});

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.text = list[i].text;
    	child_ctx.type = list[i].type;
    	return child_ctx;
    }

    const get_name_slot_changes = () => ({});
    const get_name_slot_context = () => ({});

    // (250:6) {#each types as { text, type }}
    function create_each_block$1(ctx) {
    	var span, t_value = ctx.text + "", t, dispose;

    	function click_handler() {
    		return ctx.click_handler(ctx);
    	}

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "type svelte-yn9rrb");
    			toggle_class(span, "selected", ctx.selectedType === ctx.type);
    			add_location(span, file$2, 250, 8, 6166);
    			dispose = listen_dev(span, "click", click_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if ((changed.selectedType || changed.types)) {
    				toggle_class(span, "selected", ctx.selectedType === ctx.type);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$1.name, type: "each", source: "(250:6) {#each types as { text, type }}", ctx });
    	return block;
    }

    // (262:35) 
    function create_if_block_3(ctx) {
    	var div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "charts full-size svelte-yn9rrb");
    			attr_dev(div, "id", "map");
    			add_location(div, file$2, 262, 4, 6617);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3.name, type: "if", source: "(262:35) ", ctx });
    	return block;
    }

    // (255:2) {#if selectedType !== 'map'}
    function create_if_block_1$1(ctx) {
    	var div, t, current;

    	const chart_slot_template = ctx.$$slots.chart;
    	const chart_slot = create_slot(chart_slot_template, ctx, get_chart_slot_context);

    	var if_block = (ctx.chart) && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");

    			if (chart_slot) chart_slot.c();
    			t = space();
    			if (if_block) if_block.c();

    			attr_dev(div, "class", "charts svelte-yn9rrb");
    			toggle_class(div, "full-size", ctx.chart);
    			add_location(div, file$2, 255, 4, 6346);
    		},

    		l: function claim(nodes) {
    			if (chart_slot) chart_slot.l(div_nodes);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (chart_slot) {
    				chart_slot.m(div, null);
    			}

    			append_dev(div, t);
    			if (if_block) if_block.m(div, null);
    			ctx.div_binding(div);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (chart_slot && chart_slot.p && changed.$$scope) {
    				chart_slot.p(
    					get_slot_changes(chart_slot_template, ctx, changed, get_chart_slot_changes),
    					get_slot_context(chart_slot_template, ctx, get_chart_slot_context)
    				);
    			}

    			if (ctx.chart) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}

    			if (changed.chart) {
    				toggle_class(div, "full-size", ctx.chart);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(chart_slot, local);
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(chart_slot, local);
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			if (chart_slot) chart_slot.d(detaching);
    			if (if_block) if_block.d();
    			ctx.div_binding(null);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$1.name, type: "if", source: "(255:2) {#if selectedType !== 'map'}", ctx });
    	return block;
    }

    // (258:6) {#if chart}
    function create_if_block_2(ctx) {
    	var switch_instance_anchor, current;

    	var switch_value = ctx.chart;

    	function switch_props(ctx) {
    		return {
    			props: {
    			width: ctx.availableWidth,
    			height: ctx.availableHeight
    		},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) switch_instance.$$.fragment.c();
    			switch_instance_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var switch_instance_changes = {};
    			if (changed.availableWidth) switch_instance_changes.width = ctx.availableWidth;
    			if (changed.availableHeight) switch_instance_changes.height = ctx.availableHeight;

    			if (switch_value !== (switch_value = ctx.chart)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;
    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});
    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));

    					switch_instance.$$.fragment.c();
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}

    			else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(switch_instance_anchor);
    			}

    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2.name, type: "if", source: "(258:6) {#if chart}", ctx });
    	return block;
    }

    // (280:2) {#if selectedType !== 'map'}
    function create_if_block$1(ctx) {
    	var current;

    	const marks_slot_template = ctx.$$slots.marks;
    	const marks_slot = create_slot(marks_slot_template, ctx, get_marks_slot_context);

    	const block = {
    		c: function create() {
    			if (marks_slot) marks_slot.c();
    		},

    		l: function claim(nodes) {
    			if (marks_slot) marks_slot.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			if (marks_slot) {
    				marks_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (marks_slot && marks_slot.p && changed.$$scope) {
    				marks_slot.p(
    					get_slot_changes(marks_slot_template, ctx, changed, get_marks_slot_changes),
    					get_slot_context(marks_slot_template, ctx, get_marks_slot_context)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(marks_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(marks_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (marks_slot) marks_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(280:2) {#if selectedType !== 'map'}", ctx });
    	return block;
    }

    function create_fragment$4(ctx) {
    	var div8, div2, div0, t0, div1, t1, current_block_type_index, if_block0, t2, div3, t3, div7, div4, img0, t4, span0, t6, div5, img1, t7, span1, t9, div6, img2, t10, span2, t12, current;

    	const name_slot_template = ctx.$$slots.name;
    	const name_slot = create_slot(name_slot_template, ctx, get_name_slot_context);

    	let each_value = ctx.types;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	var if_block_creators = [
    		create_if_block_1$1,
    		create_if_block_3
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.selectedType !== 'map') return 0;
    		if (ctx.selectedType === 'map') return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(null, ctx))) {
    		if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	var if_block1 = (ctx.selectedType !== 'map') && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div8 = element("div");
    			div2 = element("div");
    			div0 = element("div");

    			if (name_slot) name_slot.c();
    			t0 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			div3 = element("div");
    			t3 = space();
    			div7 = element("div");
    			div4 = element("div");
    			img0 = element("img");
    			t4 = space();
    			span0 = element("span");
    			span0.textContent = "Фильтры";
    			t6 = space();
    			div5 = element("div");
    			img1 = element("img");
    			t7 = space();
    			span1 = element("span");
    			span1.textContent = "Обновить данные";
    			t9 = space();
    			div6 = element("div");
    			img2 = element("img");
    			t10 = space();
    			span2 = element("span");
    			span2.textContent = "Вся аналитика";
    			t12 = space();
    			if (if_block1) if_block1.c();

    			attr_dev(div0, "class", "section-title svelte-yn9rrb");
    			add_location(div0, file$2, 245, 4, 6030);
    			attr_dev(div1, "class", "types svelte-yn9rrb");
    			add_location(div1, file$2, 248, 4, 6100);
    			attr_dev(div2, "class", "bar svelte-yn9rrb");
    			add_location(div2, file$2, 244, 2, 6008);
    			attr_dev(div3, "class", "vertical-line svelte-yn9rrb");
    			add_location(div3, file$2, 264, 2, 6669);
    			attr_dev(img0, "src", "./images/filters.png");
    			attr_dev(img0, "alt", "filters");
    			attr_dev(img0, "class", "svelte-yn9rrb");
    			add_location(img0, file$2, 267, 6, 6754);
    			attr_dev(span0, "class", "title svelte-yn9rrb");
    			add_location(span0, file$2, 268, 6, 6809);
    			attr_dev(div4, "class", "action svelte-yn9rrb");
    			add_location(div4, file$2, 266, 4, 6727);
    			attr_dev(img1, "src", "./images/refresh.png");
    			attr_dev(img1, "alt", "refresh");
    			attr_dev(img1, "class", "svelte-yn9rrb");
    			add_location(img1, file$2, 271, 6, 6886);
    			attr_dev(span1, "class", "title svelte-yn9rrb");
    			add_location(span1, file$2, 272, 6, 6941);
    			attr_dev(div5, "class", "action svelte-yn9rrb");
    			add_location(div5, file$2, 270, 4, 6859);
    			attr_dev(img2, "src", "./images/analitics.png");
    			attr_dev(img2, "alt", "analitics");
    			attr_dev(img2, "class", "svelte-yn9rrb");
    			add_location(img2, file$2, 275, 6, 7026);
    			attr_dev(span2, "class", "title svelte-yn9rrb");
    			add_location(span2, file$2, 276, 6, 7085);
    			attr_dev(div6, "class", "action svelte-yn9rrb");
    			add_location(div6, file$2, 274, 4, 6999);
    			attr_dev(div7, "class", "actions svelte-yn9rrb");
    			add_location(div7, file$2, 265, 2, 6701);
    			attr_dev(div8, "class", "widget svelte-yn9rrb");
    			toggle_class(div8, "spinner", ctx.$pending);
    			add_location(div8, file$2, 243, 0, 5960);
    		},

    		l: function claim(nodes) {
    			if (name_slot) name_slot.l(div0_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div2);
    			append_dev(div2, div0);

    			if (name_slot) {
    				name_slot.m(div0, null);
    			}

    			append_dev(div2, t0);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div8, t1);
    			if (~current_block_type_index) if_blocks[current_block_type_index].m(div8, null);
    			append_dev(div8, t2);
    			append_dev(div8, div3);
    			append_dev(div8, t3);
    			append_dev(div8, div7);
    			append_dev(div7, div4);
    			append_dev(div4, img0);
    			append_dev(div4, t4);
    			append_dev(div4, span0);
    			append_dev(div7, t6);
    			append_dev(div7, div5);
    			append_dev(div5, img1);
    			append_dev(div5, t7);
    			append_dev(div5, span1);
    			append_dev(div7, t9);
    			append_dev(div7, div6);
    			append_dev(div6, img2);
    			append_dev(div6, t10);
    			append_dev(div6, span2);
    			append_dev(div8, t12);
    			if (if_block1) if_block1.m(div8, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (name_slot && name_slot.p && changed.$$scope) {
    				name_slot.p(
    					get_slot_changes(name_slot_template, ctx, changed, get_name_slot_changes),
    					get_slot_context(name_slot_template, ctx, get_name_slot_context)
    				);
    			}

    			if (changed.selectedType || changed.types) {
    				each_value = ctx.types;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}

    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				if (if_block0) {
    					group_outros();
    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});
    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block0 = if_blocks[current_block_type_index];
    					if (!if_block0) {
    						if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block0.c();
    					}
    					transition_in(if_block0, 1);
    					if_block0.m(div8, t2);
    				} else {
    					if_block0 = null;
    				}
    			}

    			if (ctx.selectedType !== 'map') {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div8, null);
    				}
    			} else if (if_block1) {
    				group_outros();
    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});
    				check_outros();
    			}

    			if (changed.$pending) {
    				toggle_class(div8, "spinner", ctx.$pending);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(name_slot, local);
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(name_slot, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div8);
    			}

    			if (name_slot) name_slot.d(detaching);

    			destroy_each(each_blocks, detaching);

    			if (~current_block_type_index) if_blocks[current_block_type_index].d();
    			if (if_block1) if_block1.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    function init$1() {
      var map = new ymaps.Map('map', {
        center: [48.704272, 65.60203],
        zoom: 4,
        type: 'yandex#map',
        controls: ['zoomControl'],
      });
      map.controls.get('zoomControl').options.set({ size: 'small' });
      // Зададим цвета для раскрашивания.
      // Обратите внимание, для раскраски более крупных карт нужно задавать пятый цвет.
      var colors = ['#F0F075', '#FB6C3F', '#3D4C76', '#49C0B5'];

      var objectManager = new ymaps.ObjectManager();
      // Загрузим регионы.
      ymaps.borders
        .load('RU', {
          lang: 'ru',
          quality: 2,
        })
        .then(function(result) {
          // Очередь раскраски.
          var queue = [];
          // Создадим объект regions, где ключи это ISO код региона.
          var regions = result.features.reduce(function(acc, feature) {
            // Добавим ISO код региона в качестве feature.id для objectManager.
            var iso = feature.properties.iso3166;
            feature.id = iso;
            // Добавим опции региона по умолчанию.
            feature.options = {
              fillOpacity: 0.6,
              strokeColor: '#FFF',
              strokeOpacity: 0.5,
            };
            acc[iso] = feature;
            return acc;
          }, {});

          // Функция, которая раскрашивает регион и добавляет всех нераскрасшенных соседей в очередь на раскраску.
          function paint(iso) {
            var allowedColors = colors.slice();
            // Получим ссылку на раскрашиваемый регион и на его соседей.
            var region = regions[iso];
            var neighbors = region.properties.neighbors;
            // Если у региона есть опция fillColor, значит мы его уже раскрасили.
            if (region.options.fillColor) {
              return;
            }
            // Если у региона есть соседи, то нужно проверить, какие цвета уже заняты.
            if (neighbors.length !== 0) {
              neighbors.forEach(function(neighbor) {
                var fillColor = regions[neighbor].options.fillColor;
                // Если регион раскрашен, то исключаем его цвет.
                if (fillColor) {
                  var index = allowedColors.indexOf(fillColor);
                  if (index != -1) {
                    allowedColors.splice(index, 1);
                  }
                  // Если регион не раскрашен, то добавляем его в очередь на раскраску.
                } else if (queue.indexOf(neighbor) === -1) {
                  queue.push(neighbor);
                }
              });
            }
            // Раскрасим регион в первый доступный цвет.
            region.options.fillColor = allowedColors[0];
          }

          for (var iso in regions) {
            // Если регион не раскрашен, добавим его в очередь на раскраску.
            if (!regions[iso].options.fillColor) {
              queue.push(iso);
            }
            // Раскрасим все регионы из очереди.
            while (queue.length > 0) {
              paint(queue.shift());
            }
          }
          // Добавим регионы на карту.
          result.features = [];
          for (var reg in regions) {
            result.features.push(regions[reg]);
          }
          objectManager.add(result);
          map.geoObjects.add(objectManager);
        });
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $pending;

    	validate_store(pending, 'pending');
    	component_subscribe($$self, pending, $$value => { $pending = $$value; $$invalidate('$pending', $pending); });

    	
      const types = [
        { text: 'Карта', type: 'map' },
        { text: 'По регионам', type: 'regions' },
        { text: 'По всей России', type: 'russia' },
      ];

      afterUpdate(() => {
        if (selectedType !== 'map') {
          return;
        }

        ymaps.ready(init$1);
      });

      let selectedType = 'regions';
      let availableWidth;
      let availableHeight;
      let chartContainer;

      let { chart = null } = $$props;

    	const writable_props = ['chart'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Widget> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	const click_handler = ({ type }) => ($$invalidate('selectedType', selectedType = type));

    	function div_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('chartContainer', chartContainer = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ('chart' in $$props) $$invalidate('chart', chart = $$props.chart);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { selectedType, availableWidth, availableHeight, chartContainer, chart, $pending };
    	};

    	$$self.$inject_state = $$props => {
    		if ('selectedType' in $$props) $$invalidate('selectedType', selectedType = $$props.selectedType);
    		if ('availableWidth' in $$props) $$invalidate('availableWidth', availableWidth = $$props.availableWidth);
    		if ('availableHeight' in $$props) $$invalidate('availableHeight', availableHeight = $$props.availableHeight);
    		if ('chartContainer' in $$props) $$invalidate('chartContainer', chartContainer = $$props.chartContainer);
    		if ('chart' in $$props) $$invalidate('chart', chart = $$props.chart);
    		if ('$pending' in $$props) pending.set($pending);
    	};

    	$$self.$$.update = ($$dirty = { chartContainer: 1, chart: 1 }) => {
    		if ($$dirty.chartContainer || $$dirty.chart) { if (chartContainer && chart) {
            setTimeout(() => {
              const { width, height } = chartContainer.getBoundingClientRect();
        
              $$invalidate('availableHeight', availableHeight = height);
              $$invalidate('availableWidth', availableWidth = width);
            });
          } }
    	};

    	return {
    		types,
    		selectedType,
    		availableWidth,
    		availableHeight,
    		chartContainer,
    		chart,
    		$pending,
    		click_handler,
    		div_binding,
    		$$slots,
    		$$scope
    	};
    }

    class Widget extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, ["chart"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Widget", options, id: create_fragment$4.name });
    	}

    	get chart() {
    		throw new Error("<Widget>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set chart(value) {
    		throw new Error("<Widget>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var hb2000 = {"Белгородская область":"12101","Брянская область":"11111","Владимирская область":"11918","Воронежская область":"18519","Ивановская область":"8592","Калужская область":"7861","Костромская область":"6167","Курская область":"10451","Липецкая область":"9602","Московская область":"47660","Орловская область":"6931","Рязанская область":"8876","Смоленская область":"7651","Тамбовская область":"9719","Тверская область":"11546","Тульская область":"11845","Ярославская область":"10171","г. Москва":"73142","Северо-Западный федеральный округ":"109806","Республика Карелия":"6374","Республика Коми":"9906","Архангельская область":"12150","Ненецкий авт. округ":"541","Архангельская область без автономии":"11609","Вологодская область":"11346","Калининградская область":"7573","Ленинградская область":"11307","Мурманская область":"8020","Новгородская область":"5365","Псковская область":"5795","г.Санкт-Петербург":"31970","Южный федеральный округ ":"121370","Республика Адыгея":"4071","Республика Калмыкия":"3473","Краснодарский край":"45847","Астраханская область":"10027","Волгоградская область":"22346","Ростовская область":"35606","Северо-Кавказский федеральный округ":"92543","Республика Дагестан":"38229","Республика Ингушетия":"8463","Кабардино-Балкарская Республика":"9207","Карачаево-Черкесская Республика":"4666","Республика Северная Осетия-Алания":"7179","Чеченская Республика":"0","Ставропольский край":"24799","Приволжский федеральный округ":"279590","Республика Башкортостан":"41642","Республика Марий Эл":"6784","Республика Мордовия":"7148","Республика Татарстан":"35446","Удмуртская Республика":"16256","Чувашская Республика":"12363","Пермский край":"27701","Кировская область":"12587","Нижегородская область":"27699","Оренбургская область":"21475","Пензенская область":"11172","Самарская область":"25791","Саратовская область":"21979","Ульяновская область":"11547","Уральский федеральный округ":"115123","Курганская область":"10146","Свердловская область":"38372","Тюменская область":"34250","Ханты-Мансийский авт. округ - Югра":"15579","Ямало-Ненецкий авт. округ":"5839","Тюменская область без авт.округов":"12832","Челябинская область":"32355","Сибирский федеральный округ":"172411","Республика Алтай":"2907","Республика Тыва":"4871","Республика Хакасия":"5634","Алтайский край":"24674","Красноярский край":"28111","Иркутская область":"28062","Кемеровская область":"26580","Новосибирская область":"23138","Омская область":"18363","Томская область":"10071","Дальневосточный федеральный округ":"92094","Республика Бурятия":"11654","Республика Саха (Якутия)":"13147","Забайкальский край":"13937","Камчатский край":"3426","Приморский край":"18393","Хабаровский край":"12400","Амурская область":"9433","Магаданская область":"1925","Сахалинская область":"5210","Еврейская автономная область":"1883","Чукотский автономный округ":"686"};

    function ascending(a, b) {
      return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    }

    function bisector(compare) {
      if (compare.length === 1) compare = ascendingComparator(compare);
      return {
        left: function(a, x, lo, hi) {
          if (lo == null) lo = 0;
          if (hi == null) hi = a.length;
          while (lo < hi) {
            var mid = lo + hi >>> 1;
            if (compare(a[mid], x) < 0) lo = mid + 1;
            else hi = mid;
          }
          return lo;
        },
        right: function(a, x, lo, hi) {
          if (lo == null) lo = 0;
          if (hi == null) hi = a.length;
          while (lo < hi) {
            var mid = lo + hi >>> 1;
            if (compare(a[mid], x) > 0) hi = mid;
            else lo = mid + 1;
          }
          return lo;
        }
      };
    }

    function ascendingComparator(f) {
      return function(d, x) {
        return ascending(f(d), x);
      };
    }

    var ascendingBisect = bisector(ascending);
    var bisectRight = ascendingBisect.right;

    function sequence(start, stop, step) {
      start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

      var i = -1,
          n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
          range = new Array(n);

      while (++i < n) {
        range[i] = start + i * step;
      }

      return range;
    }

    var e10 = Math.sqrt(50),
        e5 = Math.sqrt(10),
        e2 = Math.sqrt(2);

    function ticks(start, stop, count) {
      var reverse,
          i = -1,
          n,
          ticks,
          step;

      stop = +stop, start = +start, count = +count;
      if (start === stop && count > 0) return [start];
      if (reverse = stop < start) n = start, start = stop, stop = n;
      if ((step = tickIncrement(start, stop, count)) === 0 || !isFinite(step)) return [];

      if (step > 0) {
        start = Math.ceil(start / step);
        stop = Math.floor(stop / step);
        ticks = new Array(n = Math.ceil(stop - start + 1));
        while (++i < n) ticks[i] = (start + i) * step;
      } else {
        start = Math.floor(start * step);
        stop = Math.ceil(stop * step);
        ticks = new Array(n = Math.ceil(start - stop + 1));
        while (++i < n) ticks[i] = (start - i) / step;
      }

      if (reverse) ticks.reverse();

      return ticks;
    }

    function tickIncrement(start, stop, count) {
      var step = (stop - start) / Math.max(0, count),
          power = Math.floor(Math.log(step) / Math.LN10),
          error = step / Math.pow(10, power);
      return power >= 0
          ? (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1) * Math.pow(10, power)
          : -Math.pow(10, -power) / (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1);
    }

    function tickStep(start, stop, count) {
      var step0 = Math.abs(stop - start) / Math.max(0, count),
          step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
          error = step0 / step1;
      if (error >= e10) step1 *= 10;
      else if (error >= e5) step1 *= 5;
      else if (error >= e2) step1 *= 2;
      return stop < start ? -step1 : step1;
    }

    function max(values, valueof) {
      var n = values.length,
          i = -1,
          value,
          max;

      if (valueof == null) {
        while (++i < n) { // Find the first comparable value.
          if ((value = values[i]) != null && value >= value) {
            max = value;
            while (++i < n) { // Compare the remaining values.
              if ((value = values[i]) != null && value > max) {
                max = value;
              }
            }
          }
        }
      }

      else {
        while (++i < n) { // Find the first comparable value.
          if ((value = valueof(values[i], i, values)) != null && value >= value) {
            max = value;
            while (++i < n) { // Compare the remaining values.
              if ((value = valueof(values[i], i, values)) != null && value > max) {
                max = value;
              }
            }
          }
        }
      }

      return max;
    }

    var slice = Array.prototype.slice;

    function identity(x) {
      return x;
    }

    var top = 1,
        right = 2,
        bottom = 3,
        left = 4,
        epsilon = 1e-6;

    function translateX(x) {
      return "translate(" + (x + 0.5) + ",0)";
    }

    function translateY(y) {
      return "translate(0," + (y + 0.5) + ")";
    }

    function number(scale) {
      return function(d) {
        return +scale(d);
      };
    }

    function center(scale) {
      var offset = Math.max(0, scale.bandwidth() - 1) / 2; // Adjust for 0.5px offset.
      if (scale.round()) offset = Math.round(offset);
      return function(d) {
        return +scale(d) + offset;
      };
    }

    function entering() {
      return !this.__axis;
    }

    function axis(orient, scale) {
      var tickArguments = [],
          tickValues = null,
          tickFormat = null,
          tickSizeInner = 6,
          tickSizeOuter = 6,
          tickPadding = 3,
          k = orient === top || orient === left ? -1 : 1,
          x = orient === left || orient === right ? "x" : "y",
          transform = orient === top || orient === bottom ? translateX : translateY;

      function axis(context) {
        var values = tickValues == null ? (scale.ticks ? scale.ticks.apply(scale, tickArguments) : scale.domain()) : tickValues,
            format = tickFormat == null ? (scale.tickFormat ? scale.tickFormat.apply(scale, tickArguments) : identity) : tickFormat,
            spacing = Math.max(tickSizeInner, 0) + tickPadding,
            range = scale.range(),
            range0 = +range[0] + 0.5,
            range1 = +range[range.length - 1] + 0.5,
            position = (scale.bandwidth ? center : number)(scale.copy()),
            selection = context.selection ? context.selection() : context,
            path = selection.selectAll(".domain").data([null]),
            tick = selection.selectAll(".tick").data(values, scale).order(),
            tickExit = tick.exit(),
            tickEnter = tick.enter().append("g").attr("class", "tick"),
            line = tick.select("line"),
            text = tick.select("text");

        path = path.merge(path.enter().insert("path", ".tick")
            .attr("class", "domain")
            .attr("stroke", "currentColor"));

        tick = tick.merge(tickEnter);

        line = line.merge(tickEnter.append("line")
            .attr("stroke", "currentColor")
            .attr(x + "2", k * tickSizeInner));

        text = text.merge(tickEnter.append("text")
            .attr("fill", "currentColor")
            .attr(x, k * spacing)
            .attr("dy", orient === top ? "0em" : orient === bottom ? "0.71em" : "0.32em"));

        if (context !== selection) {
          path = path.transition(context);
          tick = tick.transition(context);
          line = line.transition(context);
          text = text.transition(context);

          tickExit = tickExit.transition(context)
              .attr("opacity", epsilon)
              .attr("transform", function(d) { return isFinite(d = position(d)) ? transform(d) : this.getAttribute("transform"); });

          tickEnter
              .attr("opacity", epsilon)
              .attr("transform", function(d) { var p = this.parentNode.__axis; return transform(p && isFinite(p = p(d)) ? p : position(d)); });
        }

        tickExit.remove();

        path
            .attr("d", orient === left || orient == right
                ? (tickSizeOuter ? "M" + k * tickSizeOuter + "," + range0 + "H0.5V" + range1 + "H" + k * tickSizeOuter : "M0.5," + range0 + "V" + range1)
                : (tickSizeOuter ? "M" + range0 + "," + k * tickSizeOuter + "V0.5H" + range1 + "V" + k * tickSizeOuter : "M" + range0 + ",0.5H" + range1));

        tick
            .attr("opacity", 1)
            .attr("transform", function(d) { return transform(position(d)); });

        line
            .attr(x + "2", k * tickSizeInner);

        text
            .attr(x, k * spacing)
            .text(format);

        selection.filter(entering)
            .attr("fill", "none")
            .attr("font-size", 10)
            .attr("font-family", "sans-serif")
            .attr("text-anchor", orient === right ? "start" : orient === left ? "end" : "middle");

        selection
            .each(function() { this.__axis = position; });
      }

      axis.scale = function(_) {
        return arguments.length ? (scale = _, axis) : scale;
      };

      axis.ticks = function() {
        return tickArguments = slice.call(arguments), axis;
      };

      axis.tickArguments = function(_) {
        return arguments.length ? (tickArguments = _ == null ? [] : slice.call(_), axis) : tickArguments.slice();
      };

      axis.tickValues = function(_) {
        return arguments.length ? (tickValues = _ == null ? null : slice.call(_), axis) : tickValues && tickValues.slice();
      };

      axis.tickFormat = function(_) {
        return arguments.length ? (tickFormat = _, axis) : tickFormat;
      };

      axis.tickSize = function(_) {
        return arguments.length ? (tickSizeInner = tickSizeOuter = +_, axis) : tickSizeInner;
      };

      axis.tickSizeInner = function(_) {
        return arguments.length ? (tickSizeInner = +_, axis) : tickSizeInner;
      };

      axis.tickSizeOuter = function(_) {
        return arguments.length ? (tickSizeOuter = +_, axis) : tickSizeOuter;
      };

      axis.tickPadding = function(_) {
        return arguments.length ? (tickPadding = +_, axis) : tickPadding;
      };

      return axis;
    }

    function axisTop(scale) {
      return axis(top, scale);
    }

    function axisLeft(scale) {
      return axis(left, scale);
    }

    var noop$1 = {value: function() {}};

    function dispatch() {
      for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
        if (!(t = arguments[i] + "") || (t in _)) throw new Error("illegal type: " + t);
        _[t] = [];
      }
      return new Dispatch(_);
    }

    function Dispatch(_) {
      this._ = _;
    }

    function parseTypenames(typenames, types) {
      return typenames.trim().split(/^|\s+/).map(function(t) {
        var name = "", i = t.indexOf(".");
        if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
        if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
        return {type: t, name: name};
      });
    }

    Dispatch.prototype = dispatch.prototype = {
      constructor: Dispatch,
      on: function(typename, callback) {
        var _ = this._,
            T = parseTypenames(typename + "", _),
            t,
            i = -1,
            n = T.length;

        // If no callback was specified, return the callback of the given type and name.
        if (arguments.length < 2) {
          while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
          return;
        }

        // If a type was specified, set the callback for the given type and name.
        // Otherwise, if a null callback was specified, remove callbacks of the given name.
        if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
        while (++i < n) {
          if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
          else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
        }

        return this;
      },
      copy: function() {
        var copy = {}, _ = this._;
        for (var t in _) copy[t] = _[t].slice();
        return new Dispatch(copy);
      },
      call: function(type, that) {
        if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
        if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
        for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
      },
      apply: function(type, that, args) {
        if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
        for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
      }
    };

    function get(type, name) {
      for (var i = 0, n = type.length, c; i < n; ++i) {
        if ((c = type[i]).name === name) {
          return c.value;
        }
      }
    }

    function set(type, name, callback) {
      for (var i = 0, n = type.length; i < n; ++i) {
        if (type[i].name === name) {
          type[i] = noop$1, type = type.slice(0, i).concat(type.slice(i + 1));
          break;
        }
      }
      if (callback != null) type.push({name: name, value: callback});
      return type;
    }

    var xhtml = "http://www.w3.org/1999/xhtml";

    var namespaces = {
      svg: "http://www.w3.org/2000/svg",
      xhtml: xhtml,
      xlink: "http://www.w3.org/1999/xlink",
      xml: "http://www.w3.org/XML/1998/namespace",
      xmlns: "http://www.w3.org/2000/xmlns/"
    };

    function namespace(name) {
      var prefix = name += "", i = prefix.indexOf(":");
      if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
      return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name;
    }

    function creatorInherit(name) {
      return function() {
        var document = this.ownerDocument,
            uri = this.namespaceURI;
        return uri === xhtml && document.documentElement.namespaceURI === xhtml
            ? document.createElement(name)
            : document.createElementNS(uri, name);
      };
    }

    function creatorFixed(fullname) {
      return function() {
        return this.ownerDocument.createElementNS(fullname.space, fullname.local);
      };
    }

    function creator(name) {
      var fullname = namespace(name);
      return (fullname.local
          ? creatorFixed
          : creatorInherit)(fullname);
    }

    function none() {}

    function selector(selector) {
      return selector == null ? none : function() {
        return this.querySelector(selector);
      };
    }

    function selection_select(select) {
      if (typeof select !== "function") select = selector(select);

      for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
          if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
            if ("__data__" in node) subnode.__data__ = node.__data__;
            subgroup[i] = subnode;
          }
        }
      }

      return new Selection(subgroups, this._parents);
    }

    function empty$1() {
      return [];
    }

    function selectorAll(selector) {
      return selector == null ? empty$1 : function() {
        return this.querySelectorAll(selector);
      };
    }

    function selection_selectAll(select) {
      if (typeof select !== "function") select = selectorAll(select);

      for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            subgroups.push(select.call(node, node.__data__, i, group));
            parents.push(node);
          }
        }
      }

      return new Selection(subgroups, parents);
    }

    function matcher(selector) {
      return function() {
        return this.matches(selector);
      };
    }

    function selection_filter(match) {
      if (typeof match !== "function") match = matcher(match);

      for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
          if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
            subgroup.push(node);
          }
        }
      }

      return new Selection(subgroups, this._parents);
    }

    function sparse(update) {
      return new Array(update.length);
    }

    function selection_enter() {
      return new Selection(this._enter || this._groups.map(sparse), this._parents);
    }

    function EnterNode(parent, datum) {
      this.ownerDocument = parent.ownerDocument;
      this.namespaceURI = parent.namespaceURI;
      this._next = null;
      this._parent = parent;
      this.__data__ = datum;
    }

    EnterNode.prototype = {
      constructor: EnterNode,
      appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
      insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
      querySelector: function(selector) { return this._parent.querySelector(selector); },
      querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
    };

    function constant(x) {
      return function() {
        return x;
      };
    }

    var keyPrefix = "$"; // Protect against keys like “__proto__”.

    function bindIndex(parent, group, enter, update, exit, data) {
      var i = 0,
          node,
          groupLength = group.length,
          dataLength = data.length;

      // Put any non-null nodes that fit into update.
      // Put any null nodes into enter.
      // Put any remaining data into enter.
      for (; i < dataLength; ++i) {
        if (node = group[i]) {
          node.__data__ = data[i];
          update[i] = node;
        } else {
          enter[i] = new EnterNode(parent, data[i]);
        }
      }

      // Put any non-null nodes that don’t fit into exit.
      for (; i < groupLength; ++i) {
        if (node = group[i]) {
          exit[i] = node;
        }
      }
    }

    function bindKey(parent, group, enter, update, exit, data, key) {
      var i,
          node,
          nodeByKeyValue = {},
          groupLength = group.length,
          dataLength = data.length,
          keyValues = new Array(groupLength),
          keyValue;

      // Compute the key for each node.
      // If multiple nodes have the same key, the duplicates are added to exit.
      for (i = 0; i < groupLength; ++i) {
        if (node = group[i]) {
          keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, group);
          if (keyValue in nodeByKeyValue) {
            exit[i] = node;
          } else {
            nodeByKeyValue[keyValue] = node;
          }
        }
      }

      // Compute the key for each datum.
      // If there a node associated with this key, join and add it to update.
      // If there is not (or the key is a duplicate), add it to enter.
      for (i = 0; i < dataLength; ++i) {
        keyValue = keyPrefix + key.call(parent, data[i], i, data);
        if (node = nodeByKeyValue[keyValue]) {
          update[i] = node;
          node.__data__ = data[i];
          nodeByKeyValue[keyValue] = null;
        } else {
          enter[i] = new EnterNode(parent, data[i]);
        }
      }

      // Add any remaining nodes that were not bound to data to exit.
      for (i = 0; i < groupLength; ++i) {
        if ((node = group[i]) && (nodeByKeyValue[keyValues[i]] === node)) {
          exit[i] = node;
        }
      }
    }

    function selection_data(value, key) {
      if (!value) {
        data = new Array(this.size()), j = -1;
        this.each(function(d) { data[++j] = d; });
        return data;
      }

      var bind = key ? bindKey : bindIndex,
          parents = this._parents,
          groups = this._groups;

      if (typeof value !== "function") value = constant(value);

      for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
        var parent = parents[j],
            group = groups[j],
            groupLength = group.length,
            data = value.call(parent, parent && parent.__data__, j, parents),
            dataLength = data.length,
            enterGroup = enter[j] = new Array(dataLength),
            updateGroup = update[j] = new Array(dataLength),
            exitGroup = exit[j] = new Array(groupLength);

        bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

        // Now connect the enter nodes to their following update node, such that
        // appendChild can insert the materialized enter node before this node,
        // rather than at the end of the parent node.
        for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
          if (previous = enterGroup[i0]) {
            if (i0 >= i1) i1 = i0 + 1;
            while (!(next = updateGroup[i1]) && ++i1 < dataLength);
            previous._next = next || null;
          }
        }
      }

      update = new Selection(update, parents);
      update._enter = enter;
      update._exit = exit;
      return update;
    }

    function selection_exit() {
      return new Selection(this._exit || this._groups.map(sparse), this._parents);
    }

    function selection_join(onenter, onupdate, onexit) {
      var enter = this.enter(), update = this, exit = this.exit();
      enter = typeof onenter === "function" ? onenter(enter) : enter.append(onenter + "");
      if (onupdate != null) update = onupdate(update);
      if (onexit == null) exit.remove(); else onexit(exit);
      return enter && update ? enter.merge(update).order() : update;
    }

    function selection_merge(selection) {

      for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
        for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
          if (node = group0[i] || group1[i]) {
            merge[i] = node;
          }
        }
      }

      for (; j < m0; ++j) {
        merges[j] = groups0[j];
      }

      return new Selection(merges, this._parents);
    }

    function selection_order() {

      for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
        for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
          if (node = group[i]) {
            if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
            next = node;
          }
        }
      }

      return this;
    }

    function selection_sort(compare) {
      if (!compare) compare = ascending$1;

      function compareNode(a, b) {
        return a && b ? compare(a.__data__, b.__data__) : !a - !b;
      }

      for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            sortgroup[i] = node;
          }
        }
        sortgroup.sort(compareNode);
      }

      return new Selection(sortgroups, this._parents).order();
    }

    function ascending$1(a, b) {
      return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    }

    function selection_call() {
      var callback = arguments[0];
      arguments[0] = this;
      callback.apply(null, arguments);
      return this;
    }

    function selection_nodes() {
      var nodes = new Array(this.size()), i = -1;
      this.each(function() { nodes[++i] = this; });
      return nodes;
    }

    function selection_node() {

      for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
        for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
          var node = group[i];
          if (node) return node;
        }
      }

      return null;
    }

    function selection_size() {
      var size = 0;
      this.each(function() { ++size; });
      return size;
    }

    function selection_empty() {
      return !this.node();
    }

    function selection_each(callback) {

      for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
        for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
          if (node = group[i]) callback.call(node, node.__data__, i, group);
        }
      }

      return this;
    }

    function attrRemove(name) {
      return function() {
        this.removeAttribute(name);
      };
    }

    function attrRemoveNS(fullname) {
      return function() {
        this.removeAttributeNS(fullname.space, fullname.local);
      };
    }

    function attrConstant(name, value) {
      return function() {
        this.setAttribute(name, value);
      };
    }

    function attrConstantNS(fullname, value) {
      return function() {
        this.setAttributeNS(fullname.space, fullname.local, value);
      };
    }

    function attrFunction(name, value) {
      return function() {
        var v = value.apply(this, arguments);
        if (v == null) this.removeAttribute(name);
        else this.setAttribute(name, v);
      };
    }

    function attrFunctionNS(fullname, value) {
      return function() {
        var v = value.apply(this, arguments);
        if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
        else this.setAttributeNS(fullname.space, fullname.local, v);
      };
    }

    function selection_attr(name, value) {
      var fullname = namespace(name);

      if (arguments.length < 2) {
        var node = this.node();
        return fullname.local
            ? node.getAttributeNS(fullname.space, fullname.local)
            : node.getAttribute(fullname);
      }

      return this.each((value == null
          ? (fullname.local ? attrRemoveNS : attrRemove) : (typeof value === "function"
          ? (fullname.local ? attrFunctionNS : attrFunction)
          : (fullname.local ? attrConstantNS : attrConstant)))(fullname, value));
    }

    function defaultView(node) {
      return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
          || (node.document && node) // node is a Window
          || node.defaultView; // node is a Document
    }

    function styleRemove(name) {
      return function() {
        this.style.removeProperty(name);
      };
    }

    function styleConstant(name, value, priority) {
      return function() {
        this.style.setProperty(name, value, priority);
      };
    }

    function styleFunction(name, value, priority) {
      return function() {
        var v = value.apply(this, arguments);
        if (v == null) this.style.removeProperty(name);
        else this.style.setProperty(name, v, priority);
      };
    }

    function selection_style(name, value, priority) {
      return arguments.length > 1
          ? this.each((value == null
                ? styleRemove : typeof value === "function"
                ? styleFunction
                : styleConstant)(name, value, priority == null ? "" : priority))
          : styleValue(this.node(), name);
    }

    function styleValue(node, name) {
      return node.style.getPropertyValue(name)
          || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
    }

    function propertyRemove(name) {
      return function() {
        delete this[name];
      };
    }

    function propertyConstant(name, value) {
      return function() {
        this[name] = value;
      };
    }

    function propertyFunction(name, value) {
      return function() {
        var v = value.apply(this, arguments);
        if (v == null) delete this[name];
        else this[name] = v;
      };
    }

    function selection_property(name, value) {
      return arguments.length > 1
          ? this.each((value == null
              ? propertyRemove : typeof value === "function"
              ? propertyFunction
              : propertyConstant)(name, value))
          : this.node()[name];
    }

    function classArray(string) {
      return string.trim().split(/^|\s+/);
    }

    function classList(node) {
      return node.classList || new ClassList(node);
    }

    function ClassList(node) {
      this._node = node;
      this._names = classArray(node.getAttribute("class") || "");
    }

    ClassList.prototype = {
      add: function(name) {
        var i = this._names.indexOf(name);
        if (i < 0) {
          this._names.push(name);
          this._node.setAttribute("class", this._names.join(" "));
        }
      },
      remove: function(name) {
        var i = this._names.indexOf(name);
        if (i >= 0) {
          this._names.splice(i, 1);
          this._node.setAttribute("class", this._names.join(" "));
        }
      },
      contains: function(name) {
        return this._names.indexOf(name) >= 0;
      }
    };

    function classedAdd(node, names) {
      var list = classList(node), i = -1, n = names.length;
      while (++i < n) list.add(names[i]);
    }

    function classedRemove(node, names) {
      var list = classList(node), i = -1, n = names.length;
      while (++i < n) list.remove(names[i]);
    }

    function classedTrue(names) {
      return function() {
        classedAdd(this, names);
      };
    }

    function classedFalse(names) {
      return function() {
        classedRemove(this, names);
      };
    }

    function classedFunction(names, value) {
      return function() {
        (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
      };
    }

    function selection_classed(name, value) {
      var names = classArray(name + "");

      if (arguments.length < 2) {
        var list = classList(this.node()), i = -1, n = names.length;
        while (++i < n) if (!list.contains(names[i])) return false;
        return true;
      }

      return this.each((typeof value === "function"
          ? classedFunction : value
          ? classedTrue
          : classedFalse)(names, value));
    }

    function textRemove() {
      this.textContent = "";
    }

    function textConstant(value) {
      return function() {
        this.textContent = value;
      };
    }

    function textFunction(value) {
      return function() {
        var v = value.apply(this, arguments);
        this.textContent = v == null ? "" : v;
      };
    }

    function selection_text(value) {
      return arguments.length
          ? this.each(value == null
              ? textRemove : (typeof value === "function"
              ? textFunction
              : textConstant)(value))
          : this.node().textContent;
    }

    function htmlRemove() {
      this.innerHTML = "";
    }

    function htmlConstant(value) {
      return function() {
        this.innerHTML = value;
      };
    }

    function htmlFunction(value) {
      return function() {
        var v = value.apply(this, arguments);
        this.innerHTML = v == null ? "" : v;
      };
    }

    function selection_html(value) {
      return arguments.length
          ? this.each(value == null
              ? htmlRemove : (typeof value === "function"
              ? htmlFunction
              : htmlConstant)(value))
          : this.node().innerHTML;
    }

    function raise() {
      if (this.nextSibling) this.parentNode.appendChild(this);
    }

    function selection_raise() {
      return this.each(raise);
    }

    function lower() {
      if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
    }

    function selection_lower() {
      return this.each(lower);
    }

    function selection_append(name) {
      var create = typeof name === "function" ? name : creator(name);
      return this.select(function() {
        return this.appendChild(create.apply(this, arguments));
      });
    }

    function constantNull() {
      return null;
    }

    function selection_insert(name, before) {
      var create = typeof name === "function" ? name : creator(name),
          select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
      return this.select(function() {
        return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
      });
    }

    function remove() {
      var parent = this.parentNode;
      if (parent) parent.removeChild(this);
    }

    function selection_remove() {
      return this.each(remove);
    }

    function selection_cloneShallow() {
      return this.parentNode.insertBefore(this.cloneNode(false), this.nextSibling);
    }

    function selection_cloneDeep() {
      return this.parentNode.insertBefore(this.cloneNode(true), this.nextSibling);
    }

    function selection_clone(deep) {
      return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
    }

    function selection_datum(value) {
      return arguments.length
          ? this.property("__data__", value)
          : this.node().__data__;
    }

    var filterEvents = {};

    if (typeof document !== "undefined") {
      var element$1 = document.documentElement;
      if (!("onmouseenter" in element$1)) {
        filterEvents = {mouseenter: "mouseover", mouseleave: "mouseout"};
      }
    }

    function filterContextListener(listener, index, group) {
      listener = contextListener(listener, index, group);
      return function(event) {
        var related = event.relatedTarget;
        if (!related || (related !== this && !(related.compareDocumentPosition(this) & 8))) {
          listener.call(this, event);
        }
      };
    }

    function contextListener(listener, index, group) {
      return function(event1) {
        try {
          listener.call(this, this.__data__, index, group);
        } finally {
        }
      };
    }

    function parseTypenames$1(typenames) {
      return typenames.trim().split(/^|\s+/).map(function(t) {
        var name = "", i = t.indexOf(".");
        if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
        return {type: t, name: name};
      });
    }

    function onRemove(typename) {
      return function() {
        var on = this.__on;
        if (!on) return;
        for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
          if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
            this.removeEventListener(o.type, o.listener, o.capture);
          } else {
            on[++i] = o;
          }
        }
        if (++i) on.length = i;
        else delete this.__on;
      };
    }

    function onAdd(typename, value, capture) {
      var wrap = filterEvents.hasOwnProperty(typename.type) ? filterContextListener : contextListener;
      return function(d, i, group) {
        var on = this.__on, o, listener = wrap(value, i, group);
        if (on) for (var j = 0, m = on.length; j < m; ++j) {
          if ((o = on[j]).type === typename.type && o.name === typename.name) {
            this.removeEventListener(o.type, o.listener, o.capture);
            this.addEventListener(o.type, o.listener = listener, o.capture = capture);
            o.value = value;
            return;
          }
        }
        this.addEventListener(typename.type, listener, capture);
        o = {type: typename.type, name: typename.name, value: value, listener: listener, capture: capture};
        if (!on) this.__on = [o];
        else on.push(o);
      };
    }

    function selection_on(typename, value, capture) {
      var typenames = parseTypenames$1(typename + ""), i, n = typenames.length, t;

      if (arguments.length < 2) {
        var on = this.node().__on;
        if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
          for (i = 0, o = on[j]; i < n; ++i) {
            if ((t = typenames[i]).type === o.type && t.name === o.name) {
              return o.value;
            }
          }
        }
        return;
      }

      on = value ? onAdd : onRemove;
      if (capture == null) capture = false;
      for (i = 0; i < n; ++i) this.each(on(typenames[i], value, capture));
      return this;
    }

    function dispatchEvent(node, type, params) {
      var window = defaultView(node),
          event = window.CustomEvent;

      if (typeof event === "function") {
        event = new event(type, params);
      } else {
        event = window.document.createEvent("Event");
        if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
        else event.initEvent(type, false, false);
      }

      node.dispatchEvent(event);
    }

    function dispatchConstant(type, params) {
      return function() {
        return dispatchEvent(this, type, params);
      };
    }

    function dispatchFunction(type, params) {
      return function() {
        return dispatchEvent(this, type, params.apply(this, arguments));
      };
    }

    function selection_dispatch(type, params) {
      return this.each((typeof params === "function"
          ? dispatchFunction
          : dispatchConstant)(type, params));
    }

    var root = [null];

    function Selection(groups, parents) {
      this._groups = groups;
      this._parents = parents;
    }

    function selection() {
      return new Selection([[document.documentElement]], root);
    }

    Selection.prototype = selection.prototype = {
      constructor: Selection,
      select: selection_select,
      selectAll: selection_selectAll,
      filter: selection_filter,
      data: selection_data,
      enter: selection_enter,
      exit: selection_exit,
      join: selection_join,
      merge: selection_merge,
      order: selection_order,
      sort: selection_sort,
      call: selection_call,
      nodes: selection_nodes,
      node: selection_node,
      size: selection_size,
      empty: selection_empty,
      each: selection_each,
      attr: selection_attr,
      style: selection_style,
      property: selection_property,
      classed: selection_classed,
      text: selection_text,
      html: selection_html,
      raise: selection_raise,
      lower: selection_lower,
      append: selection_append,
      insert: selection_insert,
      remove: selection_remove,
      clone: selection_clone,
      datum: selection_datum,
      on: selection_on,
      dispatch: selection_dispatch
    };

    function select(selector) {
      return typeof selector === "string"
          ? new Selection([[document.querySelector(selector)]], [document.documentElement])
          : new Selection([[selector]], root);
    }

    function define(constructor, factory, prototype) {
      constructor.prototype = factory.prototype = prototype;
      prototype.constructor = constructor;
    }

    function extend(parent, definition) {
      var prototype = Object.create(parent.prototype);
      for (var key in definition) prototype[key] = definition[key];
      return prototype;
    }

    function Color() {}

    var darker = 0.7;
    var brighter = 1 / darker;

    var reI = "\\s*([+-]?\\d+)\\s*",
        reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
        reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
        reHex = /^#([0-9a-f]{3,8})$/,
        reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$"),
        reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$"),
        reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$"),
        reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$"),
        reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$"),
        reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

    var named = {
      aliceblue: 0xf0f8ff,
      antiquewhite: 0xfaebd7,
      aqua: 0x00ffff,
      aquamarine: 0x7fffd4,
      azure: 0xf0ffff,
      beige: 0xf5f5dc,
      bisque: 0xffe4c4,
      black: 0x000000,
      blanchedalmond: 0xffebcd,
      blue: 0x0000ff,
      blueviolet: 0x8a2be2,
      brown: 0xa52a2a,
      burlywood: 0xdeb887,
      cadetblue: 0x5f9ea0,
      chartreuse: 0x7fff00,
      chocolate: 0xd2691e,
      coral: 0xff7f50,
      cornflowerblue: 0x6495ed,
      cornsilk: 0xfff8dc,
      crimson: 0xdc143c,
      cyan: 0x00ffff,
      darkblue: 0x00008b,
      darkcyan: 0x008b8b,
      darkgoldenrod: 0xb8860b,
      darkgray: 0xa9a9a9,
      darkgreen: 0x006400,
      darkgrey: 0xa9a9a9,
      darkkhaki: 0xbdb76b,
      darkmagenta: 0x8b008b,
      darkolivegreen: 0x556b2f,
      darkorange: 0xff8c00,
      darkorchid: 0x9932cc,
      darkred: 0x8b0000,
      darksalmon: 0xe9967a,
      darkseagreen: 0x8fbc8f,
      darkslateblue: 0x483d8b,
      darkslategray: 0x2f4f4f,
      darkslategrey: 0x2f4f4f,
      darkturquoise: 0x00ced1,
      darkviolet: 0x9400d3,
      deeppink: 0xff1493,
      deepskyblue: 0x00bfff,
      dimgray: 0x696969,
      dimgrey: 0x696969,
      dodgerblue: 0x1e90ff,
      firebrick: 0xb22222,
      floralwhite: 0xfffaf0,
      forestgreen: 0x228b22,
      fuchsia: 0xff00ff,
      gainsboro: 0xdcdcdc,
      ghostwhite: 0xf8f8ff,
      gold: 0xffd700,
      goldenrod: 0xdaa520,
      gray: 0x808080,
      green: 0x008000,
      greenyellow: 0xadff2f,
      grey: 0x808080,
      honeydew: 0xf0fff0,
      hotpink: 0xff69b4,
      indianred: 0xcd5c5c,
      indigo: 0x4b0082,
      ivory: 0xfffff0,
      khaki: 0xf0e68c,
      lavender: 0xe6e6fa,
      lavenderblush: 0xfff0f5,
      lawngreen: 0x7cfc00,
      lemonchiffon: 0xfffacd,
      lightblue: 0xadd8e6,
      lightcoral: 0xf08080,
      lightcyan: 0xe0ffff,
      lightgoldenrodyellow: 0xfafad2,
      lightgray: 0xd3d3d3,
      lightgreen: 0x90ee90,
      lightgrey: 0xd3d3d3,
      lightpink: 0xffb6c1,
      lightsalmon: 0xffa07a,
      lightseagreen: 0x20b2aa,
      lightskyblue: 0x87cefa,
      lightslategray: 0x778899,
      lightslategrey: 0x778899,
      lightsteelblue: 0xb0c4de,
      lightyellow: 0xffffe0,
      lime: 0x00ff00,
      limegreen: 0x32cd32,
      linen: 0xfaf0e6,
      magenta: 0xff00ff,
      maroon: 0x800000,
      mediumaquamarine: 0x66cdaa,
      mediumblue: 0x0000cd,
      mediumorchid: 0xba55d3,
      mediumpurple: 0x9370db,
      mediumseagreen: 0x3cb371,
      mediumslateblue: 0x7b68ee,
      mediumspringgreen: 0x00fa9a,
      mediumturquoise: 0x48d1cc,
      mediumvioletred: 0xc71585,
      midnightblue: 0x191970,
      mintcream: 0xf5fffa,
      mistyrose: 0xffe4e1,
      moccasin: 0xffe4b5,
      navajowhite: 0xffdead,
      navy: 0x000080,
      oldlace: 0xfdf5e6,
      olive: 0x808000,
      olivedrab: 0x6b8e23,
      orange: 0xffa500,
      orangered: 0xff4500,
      orchid: 0xda70d6,
      palegoldenrod: 0xeee8aa,
      palegreen: 0x98fb98,
      paleturquoise: 0xafeeee,
      palevioletred: 0xdb7093,
      papayawhip: 0xffefd5,
      peachpuff: 0xffdab9,
      peru: 0xcd853f,
      pink: 0xffc0cb,
      plum: 0xdda0dd,
      powderblue: 0xb0e0e6,
      purple: 0x800080,
      rebeccapurple: 0x663399,
      red: 0xff0000,
      rosybrown: 0xbc8f8f,
      royalblue: 0x4169e1,
      saddlebrown: 0x8b4513,
      salmon: 0xfa8072,
      sandybrown: 0xf4a460,
      seagreen: 0x2e8b57,
      seashell: 0xfff5ee,
      sienna: 0xa0522d,
      silver: 0xc0c0c0,
      skyblue: 0x87ceeb,
      slateblue: 0x6a5acd,
      slategray: 0x708090,
      slategrey: 0x708090,
      snow: 0xfffafa,
      springgreen: 0x00ff7f,
      steelblue: 0x4682b4,
      tan: 0xd2b48c,
      teal: 0x008080,
      thistle: 0xd8bfd8,
      tomato: 0xff6347,
      turquoise: 0x40e0d0,
      violet: 0xee82ee,
      wheat: 0xf5deb3,
      white: 0xffffff,
      whitesmoke: 0xf5f5f5,
      yellow: 0xffff00,
      yellowgreen: 0x9acd32
    };

    define(Color, color, {
      copy: function(channels) {
        return Object.assign(new this.constructor, this, channels);
      },
      displayable: function() {
        return this.rgb().displayable();
      },
      hex: color_formatHex, // Deprecated! Use color.formatHex.
      formatHex: color_formatHex,
      formatHsl: color_formatHsl,
      formatRgb: color_formatRgb,
      toString: color_formatRgb
    });

    function color_formatHex() {
      return this.rgb().formatHex();
    }

    function color_formatHsl() {
      return hslConvert(this).formatHsl();
    }

    function color_formatRgb() {
      return this.rgb().formatRgb();
    }

    function color(format) {
      var m, l;
      format = (format + "").trim().toLowerCase();
      return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
          : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
          : l === 8 ? new Rgb(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
          : l === 4 ? new Rgb((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
          : null) // invalid hex
          : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
          : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
          : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
          : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
          : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
          : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
          : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
          : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
          : null;
    }

    function rgbn(n) {
      return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
    }

    function rgba(r, g, b, a) {
      if (a <= 0) r = g = b = NaN;
      return new Rgb(r, g, b, a);
    }

    function rgbConvert(o) {
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Rgb;
      o = o.rgb();
      return new Rgb(o.r, o.g, o.b, o.opacity);
    }

    function rgb(r, g, b, opacity) {
      return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
    }

    function Rgb(r, g, b, opacity) {
      this.r = +r;
      this.g = +g;
      this.b = +b;
      this.opacity = +opacity;
    }

    define(Rgb, rgb, extend(Color, {
      brighter: function(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      darker: function(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      rgb: function() {
        return this;
      },
      displayable: function() {
        return (-0.5 <= this.r && this.r < 255.5)
            && (-0.5 <= this.g && this.g < 255.5)
            && (-0.5 <= this.b && this.b < 255.5)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      hex: rgb_formatHex, // Deprecated! Use color.formatHex.
      formatHex: rgb_formatHex,
      formatRgb: rgb_formatRgb,
      toString: rgb_formatRgb
    }));

    function rgb_formatHex() {
      return "#" + hex(this.r) + hex(this.g) + hex(this.b);
    }

    function rgb_formatRgb() {
      var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
      return (a === 1 ? "rgb(" : "rgba(")
          + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
          + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
          + Math.max(0, Math.min(255, Math.round(this.b) || 0))
          + (a === 1 ? ")" : ", " + a + ")");
    }

    function hex(value) {
      value = Math.max(0, Math.min(255, Math.round(value) || 0));
      return (value < 16 ? "0" : "") + value.toString(16);
    }

    function hsla(h, s, l, a) {
      if (a <= 0) h = s = l = NaN;
      else if (l <= 0 || l >= 1) h = s = NaN;
      else if (s <= 0) h = NaN;
      return new Hsl(h, s, l, a);
    }

    function hslConvert(o) {
      if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Hsl;
      if (o instanceof Hsl) return o;
      o = o.rgb();
      var r = o.r / 255,
          g = o.g / 255,
          b = o.b / 255,
          min = Math.min(r, g, b),
          max = Math.max(r, g, b),
          h = NaN,
          s = max - min,
          l = (max + min) / 2;
      if (s) {
        if (r === max) h = (g - b) / s + (g < b) * 6;
        else if (g === max) h = (b - r) / s + 2;
        else h = (r - g) / s + 4;
        s /= l < 0.5 ? max + min : 2 - max - min;
        h *= 60;
      } else {
        s = l > 0 && l < 1 ? 0 : h;
      }
      return new Hsl(h, s, l, o.opacity);
    }

    function hsl(h, s, l, opacity) {
      return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
    }

    function Hsl(h, s, l, opacity) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
      this.opacity = +opacity;
    }

    define(Hsl, hsl, extend(Color, {
      brighter: function(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      darker: function(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      rgb: function() {
        var h = this.h % 360 + (this.h < 0) * 360,
            s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
            l = this.l,
            m2 = l + (l < 0.5 ? l : 1 - l) * s,
            m1 = 2 * l - m2;
        return new Rgb(
          hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
          hsl2rgb(h, m1, m2),
          hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
          this.opacity
        );
      },
      displayable: function() {
        return (0 <= this.s && this.s <= 1 || isNaN(this.s))
            && (0 <= this.l && this.l <= 1)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      formatHsl: function() {
        var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
        return (a === 1 ? "hsl(" : "hsla(")
            + (this.h || 0) + ", "
            + (this.s || 0) * 100 + "%, "
            + (this.l || 0) * 100 + "%"
            + (a === 1 ? ")" : ", " + a + ")");
      }
    }));

    /* From FvD 13.37, CSS Color Module Level 3 */
    function hsl2rgb(h, m1, m2) {
      return (h < 60 ? m1 + (m2 - m1) * h / 60
          : h < 180 ? m2
          : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
          : m1) * 255;
    }

    function constant$1(x) {
      return function() {
        return x;
      };
    }

    function linear(a, d) {
      return function(t) {
        return a + t * d;
      };
    }

    function exponential(a, b, y) {
      return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
        return Math.pow(a + t * b, y);
      };
    }

    function gamma(y) {
      return (y = +y) === 1 ? nogamma : function(a, b) {
        return b - a ? exponential(a, b, y) : constant$1(isNaN(a) ? b : a);
      };
    }

    function nogamma(a, b) {
      var d = b - a;
      return d ? linear(a, d) : constant$1(isNaN(a) ? b : a);
    }

    var interpolateRgb = (function rgbGamma(y) {
      var color = gamma(y);

      function rgb$1(start, end) {
        var r = color((start = rgb(start)).r, (end = rgb(end)).r),
            g = color(start.g, end.g),
            b = color(start.b, end.b),
            opacity = nogamma(start.opacity, end.opacity);
        return function(t) {
          start.r = r(t);
          start.g = g(t);
          start.b = b(t);
          start.opacity = opacity(t);
          return start + "";
        };
      }

      rgb$1.gamma = rgbGamma;

      return rgb$1;
    })(1);

    function array(a, b) {
      var nb = b ? b.length : 0,
          na = a ? Math.min(nb, a.length) : 0,
          x = new Array(na),
          c = new Array(nb),
          i;

      for (i = 0; i < na; ++i) x[i] = interpolateValue(a[i], b[i]);
      for (; i < nb; ++i) c[i] = b[i];

      return function(t) {
        for (i = 0; i < na; ++i) c[i] = x[i](t);
        return c;
      };
    }

    function date(a, b) {
      var d = new Date;
      return a = +a, b -= a, function(t) {
        return d.setTime(a + b * t), d;
      };
    }

    function interpolateNumber(a, b) {
      return a = +a, b -= a, function(t) {
        return a + b * t;
      };
    }

    function object(a, b) {
      var i = {},
          c = {},
          k;

      if (a === null || typeof a !== "object") a = {};
      if (b === null || typeof b !== "object") b = {};

      for (k in b) {
        if (k in a) {
          i[k] = interpolateValue(a[k], b[k]);
        } else {
          c[k] = b[k];
        }
      }

      return function(t) {
        for (k in i) c[k] = i[k](t);
        return c;
      };
    }

    var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
        reB = new RegExp(reA.source, "g");

    function zero(b) {
      return function() {
        return b;
      };
    }

    function one(b) {
      return function(t) {
        return b(t) + "";
      };
    }

    function interpolateString(a, b) {
      var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
          am, // current match in a
          bm, // current match in b
          bs, // string preceding current number in b, if any
          i = -1, // index in s
          s = [], // string constants and placeholders
          q = []; // number interpolators

      // Coerce inputs to strings.
      a = a + "", b = b + "";

      // Interpolate pairs of numbers in a & b.
      while ((am = reA.exec(a))
          && (bm = reB.exec(b))) {
        if ((bs = bm.index) > bi) { // a string precedes the next number in b
          bs = b.slice(bi, bs);
          if (s[i]) s[i] += bs; // coalesce with previous string
          else s[++i] = bs;
        }
        if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
          if (s[i]) s[i] += bm; // coalesce with previous string
          else s[++i] = bm;
        } else { // interpolate non-matching numbers
          s[++i] = null;
          q.push({i: i, x: interpolateNumber(am, bm)});
        }
        bi = reB.lastIndex;
      }

      // Add remains of b.
      if (bi < b.length) {
        bs = b.slice(bi);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }

      // Special optimization for only a single match.
      // Otherwise, interpolate each of the numbers and rejoin the string.
      return s.length < 2 ? (q[0]
          ? one(q[0].x)
          : zero(b))
          : (b = q.length, function(t) {
              for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
              return s.join("");
            });
    }

    function interpolateValue(a, b) {
      var t = typeof b, c;
      return b == null || t === "boolean" ? constant$1(b)
          : (t === "number" ? interpolateNumber
          : t === "string" ? ((c = color(b)) ? (b = c, interpolateRgb) : interpolateString)
          : b instanceof color ? interpolateRgb
          : b instanceof Date ? date
          : Array.isArray(b) ? array
          : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
          : interpolateNumber)(a, b);
    }

    function interpolateRound(a, b) {
      return a = +a, b -= a, function(t) {
        return Math.round(a + b * t);
      };
    }

    var degrees = 180 / Math.PI;

    var identity$1 = {
      translateX: 0,
      translateY: 0,
      rotate: 0,
      skewX: 0,
      scaleX: 1,
      scaleY: 1
    };

    function decompose(a, b, c, d, e, f) {
      var scaleX, scaleY, skewX;
      if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
      if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
      if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
      if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
      return {
        translateX: e,
        translateY: f,
        rotate: Math.atan2(b, a) * degrees,
        skewX: Math.atan(skewX) * degrees,
        scaleX: scaleX,
        scaleY: scaleY
      };
    }

    var cssNode,
        cssRoot,
        cssView,
        svgNode;

    function parseCss(value) {
      if (value === "none") return identity$1;
      if (!cssNode) cssNode = document.createElement("DIV"), cssRoot = document.documentElement, cssView = document.defaultView;
      cssNode.style.transform = value;
      value = cssView.getComputedStyle(cssRoot.appendChild(cssNode), null).getPropertyValue("transform");
      cssRoot.removeChild(cssNode);
      value = value.slice(7, -1).split(",");
      return decompose(+value[0], +value[1], +value[2], +value[3], +value[4], +value[5]);
    }

    function parseSvg(value) {
      if (value == null) return identity$1;
      if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
      svgNode.setAttribute("transform", value);
      if (!(value = svgNode.transform.baseVal.consolidate())) return identity$1;
      value = value.matrix;
      return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
    }

    function interpolateTransform(parse, pxComma, pxParen, degParen) {

      function pop(s) {
        return s.length ? s.pop() + " " : "";
      }

      function translate(xa, ya, xb, yb, s, q) {
        if (xa !== xb || ya !== yb) {
          var i = s.push("translate(", null, pxComma, null, pxParen);
          q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
        } else if (xb || yb) {
          s.push("translate(" + xb + pxComma + yb + pxParen);
        }
      }

      function rotate(a, b, s, q) {
        if (a !== b) {
          if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
          q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: interpolateNumber(a, b)});
        } else if (b) {
          s.push(pop(s) + "rotate(" + b + degParen);
        }
      }

      function skewX(a, b, s, q) {
        if (a !== b) {
          q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: interpolateNumber(a, b)});
        } else if (b) {
          s.push(pop(s) + "skewX(" + b + degParen);
        }
      }

      function scale(xa, ya, xb, yb, s, q) {
        if (xa !== xb || ya !== yb) {
          var i = s.push(pop(s) + "scale(", null, ",", null, ")");
          q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
        } else if (xb !== 1 || yb !== 1) {
          s.push(pop(s) + "scale(" + xb + "," + yb + ")");
        }
      }

      return function(a, b) {
        var s = [], // string constants and placeholders
            q = []; // number interpolators
        a = parse(a), b = parse(b);
        translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
        rotate(a.rotate, b.rotate, s, q);
        skewX(a.skewX, b.skewX, s, q);
        scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
        a = b = null; // gc
        return function(t) {
          var i = -1, n = q.length, o;
          while (++i < n) s[(o = q[i]).i] = o.x(t);
          return s.join("");
        };
      };
    }

    var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
    var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

    var frame = 0, // is an animation frame pending?
        timeout = 0, // is a timeout pending?
        interval = 0, // are any timers active?
        pokeDelay = 1000, // how frequently we check for clock skew
        taskHead,
        taskTail,
        clockLast = 0,
        clockNow = 0,
        clockSkew = 0,
        clock = typeof performance === "object" && performance.now ? performance : Date,
        setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

    function now() {
      return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
    }

    function clearNow() {
      clockNow = 0;
    }

    function Timer() {
      this._call =
      this._time =
      this._next = null;
    }

    Timer.prototype = timer.prototype = {
      constructor: Timer,
      restart: function(callback, delay, time) {
        if (typeof callback !== "function") throw new TypeError("callback is not a function");
        time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
        if (!this._next && taskTail !== this) {
          if (taskTail) taskTail._next = this;
          else taskHead = this;
          taskTail = this;
        }
        this._call = callback;
        this._time = time;
        sleep();
      },
      stop: function() {
        if (this._call) {
          this._call = null;
          this._time = Infinity;
          sleep();
        }
      }
    };

    function timer(callback, delay, time) {
      var t = new Timer;
      t.restart(callback, delay, time);
      return t;
    }

    function timerFlush() {
      now(); // Get the current time, if not already set.
      ++frame; // Pretend we’ve set an alarm, if we haven’t already.
      var t = taskHead, e;
      while (t) {
        if ((e = clockNow - t._time) >= 0) t._call.call(null, e);
        t = t._next;
      }
      --frame;
    }

    function wake() {
      clockNow = (clockLast = clock.now()) + clockSkew;
      frame = timeout = 0;
      try {
        timerFlush();
      } finally {
        frame = 0;
        nap();
        clockNow = 0;
      }
    }

    function poke() {
      var now = clock.now(), delay = now - clockLast;
      if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
    }

    function nap() {
      var t0, t1 = taskHead, t2, time = Infinity;
      while (t1) {
        if (t1._call) {
          if (time > t1._time) time = t1._time;
          t0 = t1, t1 = t1._next;
        } else {
          t2 = t1._next, t1._next = null;
          t1 = t0 ? t0._next = t2 : taskHead = t2;
        }
      }
      taskTail = t0;
      sleep(time);
    }

    function sleep(time) {
      if (frame) return; // Soonest alarm already set, or will be.
      if (timeout) timeout = clearTimeout(timeout);
      var delay = time - clockNow; // Strictly less than if we recomputed clockNow.
      if (delay > 24) {
        if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
        if (interval) interval = clearInterval(interval);
      } else {
        if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
        frame = 1, setFrame(wake);
      }
    }

    function timeout$1(callback, delay, time) {
      var t = new Timer;
      delay = delay == null ? 0 : +delay;
      t.restart(function(elapsed) {
        t.stop();
        callback(elapsed + delay);
      }, delay, time);
      return t;
    }

    var emptyOn = dispatch("start", "end", "cancel", "interrupt");
    var emptyTween = [];

    var CREATED = 0;
    var SCHEDULED = 1;
    var STARTING = 2;
    var STARTED = 3;
    var RUNNING = 4;
    var ENDING = 5;
    var ENDED = 6;

    function schedule(node, name, id, index, group, timing) {
      var schedules = node.__transition;
      if (!schedules) node.__transition = {};
      else if (id in schedules) return;
      create(node, id, {
        name: name,
        index: index, // For context during callback.
        group: group, // For context during callback.
        on: emptyOn,
        tween: emptyTween,
        time: timing.time,
        delay: timing.delay,
        duration: timing.duration,
        ease: timing.ease,
        timer: null,
        state: CREATED
      });
    }

    function init$2(node, id) {
      var schedule = get$1(node, id);
      if (schedule.state > CREATED) throw new Error("too late; already scheduled");
      return schedule;
    }

    function set$1(node, id) {
      var schedule = get$1(node, id);
      if (schedule.state > STARTED) throw new Error("too late; already running");
      return schedule;
    }

    function get$1(node, id) {
      var schedule = node.__transition;
      if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
      return schedule;
    }

    function create(node, id, self) {
      var schedules = node.__transition,
          tween;

      // Initialize the self timer when the transition is created.
      // Note the actual delay is not known until the first callback!
      schedules[id] = self;
      self.timer = timer(schedule, 0, self.time);

      function schedule(elapsed) {
        self.state = SCHEDULED;
        self.timer.restart(start, self.delay, self.time);

        // If the elapsed delay is less than our first sleep, start immediately.
        if (self.delay <= elapsed) start(elapsed - self.delay);
      }

      function start(elapsed) {
        var i, j, n, o;

        // If the state is not SCHEDULED, then we previously errored on start.
        if (self.state !== SCHEDULED) return stop();

        for (i in schedules) {
          o = schedules[i];
          if (o.name !== self.name) continue;

          // While this element already has a starting transition during this frame,
          // defer starting an interrupting transition until that transition has a
          // chance to tick (and possibly end); see d3/d3-transition#54!
          if (o.state === STARTED) return timeout$1(start);

          // Interrupt the active transition, if any.
          if (o.state === RUNNING) {
            o.state = ENDED;
            o.timer.stop();
            o.on.call("interrupt", node, node.__data__, o.index, o.group);
            delete schedules[i];
          }

          // Cancel any pre-empted transitions.
          else if (+i < id) {
            o.state = ENDED;
            o.timer.stop();
            o.on.call("cancel", node, node.__data__, o.index, o.group);
            delete schedules[i];
          }
        }

        // Defer the first tick to end of the current frame; see d3/d3#1576.
        // Note the transition may be canceled after start and before the first tick!
        // Note this must be scheduled before the start event; see d3/d3-transition#16!
        // Assuming this is successful, subsequent callbacks go straight to tick.
        timeout$1(function() {
          if (self.state === STARTED) {
            self.state = RUNNING;
            self.timer.restart(tick, self.delay, self.time);
            tick(elapsed);
          }
        });

        // Dispatch the start event.
        // Note this must be done before the tween are initialized.
        self.state = STARTING;
        self.on.call("start", node, node.__data__, self.index, self.group);
        if (self.state !== STARTING) return; // interrupted
        self.state = STARTED;

        // Initialize the tween, deleting null tween.
        tween = new Array(n = self.tween.length);
        for (i = 0, j = -1; i < n; ++i) {
          if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
            tween[++j] = o;
          }
        }
        tween.length = j + 1;
      }

      function tick(elapsed) {
        var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
            i = -1,
            n = tween.length;

        while (++i < n) {
          tween[i].call(node, t);
        }

        // Dispatch the end event.
        if (self.state === ENDING) {
          self.on.call("end", node, node.__data__, self.index, self.group);
          stop();
        }
      }

      function stop() {
        self.state = ENDED;
        self.timer.stop();
        delete schedules[id];
        for (var i in schedules) return; // eslint-disable-line no-unused-vars
        delete node.__transition;
      }
    }

    function interrupt(node, name) {
      var schedules = node.__transition,
          schedule,
          active,
          empty = true,
          i;

      if (!schedules) return;

      name = name == null ? null : name + "";

      for (i in schedules) {
        if ((schedule = schedules[i]).name !== name) { empty = false; continue; }
        active = schedule.state > STARTING && schedule.state < ENDING;
        schedule.state = ENDED;
        schedule.timer.stop();
        schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
        delete schedules[i];
      }

      if (empty) delete node.__transition;
    }

    function selection_interrupt(name) {
      return this.each(function() {
        interrupt(this, name);
      });
    }

    function tweenRemove(id, name) {
      var tween0, tween1;
      return function() {
        var schedule = set$1(this, id),
            tween = schedule.tween;

        // If this node shared tween with the previous node,
        // just assign the updated shared tween and we’re done!
        // Otherwise, copy-on-write.
        if (tween !== tween0) {
          tween1 = tween0 = tween;
          for (var i = 0, n = tween1.length; i < n; ++i) {
            if (tween1[i].name === name) {
              tween1 = tween1.slice();
              tween1.splice(i, 1);
              break;
            }
          }
        }

        schedule.tween = tween1;
      };
    }

    function tweenFunction(id, name, value) {
      var tween0, tween1;
      if (typeof value !== "function") throw new Error;
      return function() {
        var schedule = set$1(this, id),
            tween = schedule.tween;

        // If this node shared tween with the previous node,
        // just assign the updated shared tween and we’re done!
        // Otherwise, copy-on-write.
        if (tween !== tween0) {
          tween1 = (tween0 = tween).slice();
          for (var t = {name: name, value: value}, i = 0, n = tween1.length; i < n; ++i) {
            if (tween1[i].name === name) {
              tween1[i] = t;
              break;
            }
          }
          if (i === n) tween1.push(t);
        }

        schedule.tween = tween1;
      };
    }

    function transition_tween(name, value) {
      var id = this._id;

      name += "";

      if (arguments.length < 2) {
        var tween = get$1(this.node(), id).tween;
        for (var i = 0, n = tween.length, t; i < n; ++i) {
          if ((t = tween[i]).name === name) {
            return t.value;
          }
        }
        return null;
      }

      return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
    }

    function tweenValue(transition, name, value) {
      var id = transition._id;

      transition.each(function() {
        var schedule = set$1(this, id);
        (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
      });

      return function(node) {
        return get$1(node, id).value[name];
      };
    }

    function interpolate(a, b) {
      var c;
      return (typeof b === "number" ? interpolateNumber
          : b instanceof color ? interpolateRgb
          : (c = color(b)) ? (b = c, interpolateRgb)
          : interpolateString)(a, b);
    }

    function attrRemove$1(name) {
      return function() {
        this.removeAttribute(name);
      };
    }

    function attrRemoveNS$1(fullname) {
      return function() {
        this.removeAttributeNS(fullname.space, fullname.local);
      };
    }

    function attrConstant$1(name, interpolate, value1) {
      var string00,
          string1 = value1 + "",
          interpolate0;
      return function() {
        var string0 = this.getAttribute(name);
        return string0 === string1 ? null
            : string0 === string00 ? interpolate0
            : interpolate0 = interpolate(string00 = string0, value1);
      };
    }

    function attrConstantNS$1(fullname, interpolate, value1) {
      var string00,
          string1 = value1 + "",
          interpolate0;
      return function() {
        var string0 = this.getAttributeNS(fullname.space, fullname.local);
        return string0 === string1 ? null
            : string0 === string00 ? interpolate0
            : interpolate0 = interpolate(string00 = string0, value1);
      };
    }

    function attrFunction$1(name, interpolate, value) {
      var string00,
          string10,
          interpolate0;
      return function() {
        var string0, value1 = value(this), string1;
        if (value1 == null) return void this.removeAttribute(name);
        string0 = this.getAttribute(name);
        string1 = value1 + "";
        return string0 === string1 ? null
            : string0 === string00 && string1 === string10 ? interpolate0
            : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
      };
    }

    function attrFunctionNS$1(fullname, interpolate, value) {
      var string00,
          string10,
          interpolate0;
      return function() {
        var string0, value1 = value(this), string1;
        if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
        string0 = this.getAttributeNS(fullname.space, fullname.local);
        string1 = value1 + "";
        return string0 === string1 ? null
            : string0 === string00 && string1 === string10 ? interpolate0
            : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
      };
    }

    function transition_attr(name, value) {
      var fullname = namespace(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate;
      return this.attrTween(name, typeof value === "function"
          ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)(fullname, i, tweenValue(this, "attr." + name, value))
          : value == null ? (fullname.local ? attrRemoveNS$1 : attrRemove$1)(fullname)
          : (fullname.local ? attrConstantNS$1 : attrConstant$1)(fullname, i, value));
    }

    function attrInterpolate(name, i) {
      return function(t) {
        this.setAttribute(name, i(t));
      };
    }

    function attrInterpolateNS(fullname, i) {
      return function(t) {
        this.setAttributeNS(fullname.space, fullname.local, i(t));
      };
    }

    function attrTweenNS(fullname, value) {
      var t0, i0;
      function tween() {
        var i = value.apply(this, arguments);
        if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
        return t0;
      }
      tween._value = value;
      return tween;
    }

    function attrTween(name, value) {
      var t0, i0;
      function tween() {
        var i = value.apply(this, arguments);
        if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
        return t0;
      }
      tween._value = value;
      return tween;
    }

    function transition_attrTween(name, value) {
      var key = "attr." + name;
      if (arguments.length < 2) return (key = this.tween(key)) && key._value;
      if (value == null) return this.tween(key, null);
      if (typeof value !== "function") throw new Error;
      var fullname = namespace(name);
      return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
    }

    function delayFunction(id, value) {
      return function() {
        init$2(this, id).delay = +value.apply(this, arguments);
      };
    }

    function delayConstant(id, value) {
      return value = +value, function() {
        init$2(this, id).delay = value;
      };
    }

    function transition_delay(value) {
      var id = this._id;

      return arguments.length
          ? this.each((typeof value === "function"
              ? delayFunction
              : delayConstant)(id, value))
          : get$1(this.node(), id).delay;
    }

    function durationFunction(id, value) {
      return function() {
        set$1(this, id).duration = +value.apply(this, arguments);
      };
    }

    function durationConstant(id, value) {
      return value = +value, function() {
        set$1(this, id).duration = value;
      };
    }

    function transition_duration(value) {
      var id = this._id;

      return arguments.length
          ? this.each((typeof value === "function"
              ? durationFunction
              : durationConstant)(id, value))
          : get$1(this.node(), id).duration;
    }

    function easeConstant(id, value) {
      if (typeof value !== "function") throw new Error;
      return function() {
        set$1(this, id).ease = value;
      };
    }

    function transition_ease(value) {
      var id = this._id;

      return arguments.length
          ? this.each(easeConstant(id, value))
          : get$1(this.node(), id).ease;
    }

    function transition_filter(match) {
      if (typeof match !== "function") match = matcher(match);

      for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
          if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
            subgroup.push(node);
          }
        }
      }

      return new Transition(subgroups, this._parents, this._name, this._id);
    }

    function transition_merge(transition) {
      if (transition._id !== this._id) throw new Error;

      for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
        for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
          if (node = group0[i] || group1[i]) {
            merge[i] = node;
          }
        }
      }

      for (; j < m0; ++j) {
        merges[j] = groups0[j];
      }

      return new Transition(merges, this._parents, this._name, this._id);
    }

    function start(name) {
      return (name + "").trim().split(/^|\s+/).every(function(t) {
        var i = t.indexOf(".");
        if (i >= 0) t = t.slice(0, i);
        return !t || t === "start";
      });
    }

    function onFunction(id, name, listener) {
      var on0, on1, sit = start(name) ? init$2 : set$1;
      return function() {
        var schedule = sit(this, id),
            on = schedule.on;

        // If this node shared a dispatch with the previous node,
        // just assign the updated shared dispatch and we’re done!
        // Otherwise, copy-on-write.
        if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

        schedule.on = on1;
      };
    }

    function transition_on(name, listener) {
      var id = this._id;

      return arguments.length < 2
          ? get$1(this.node(), id).on.on(name)
          : this.each(onFunction(id, name, listener));
    }

    function removeFunction(id) {
      return function() {
        var parent = this.parentNode;
        for (var i in this.__transition) if (+i !== id) return;
        if (parent) parent.removeChild(this);
      };
    }

    function transition_remove() {
      return this.on("end.remove", removeFunction(this._id));
    }

    function transition_select(select) {
      var name = this._name,
          id = this._id;

      if (typeof select !== "function") select = selector(select);

      for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
          if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
            if ("__data__" in node) subnode.__data__ = node.__data__;
            subgroup[i] = subnode;
            schedule(subgroup[i], name, id, i, subgroup, get$1(node, id));
          }
        }
      }

      return new Transition(subgroups, this._parents, name, id);
    }

    function transition_selectAll(select) {
      var name = this._name,
          id = this._id;

      if (typeof select !== "function") select = selectorAll(select);

      for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            for (var children = select.call(node, node.__data__, i, group), child, inherit = get$1(node, id), k = 0, l = children.length; k < l; ++k) {
              if (child = children[k]) {
                schedule(child, name, id, k, children, inherit);
              }
            }
            subgroups.push(children);
            parents.push(node);
          }
        }
      }

      return new Transition(subgroups, parents, name, id);
    }

    var Selection$1 = selection.prototype.constructor;

    function transition_selection() {
      return new Selection$1(this._groups, this._parents);
    }

    function styleNull(name, interpolate) {
      var string00,
          string10,
          interpolate0;
      return function() {
        var string0 = styleValue(this, name),
            string1 = (this.style.removeProperty(name), styleValue(this, name));
        return string0 === string1 ? null
            : string0 === string00 && string1 === string10 ? interpolate0
            : interpolate0 = interpolate(string00 = string0, string10 = string1);
      };
    }

    function styleRemove$1(name) {
      return function() {
        this.style.removeProperty(name);
      };
    }

    function styleConstant$1(name, interpolate, value1) {
      var string00,
          string1 = value1 + "",
          interpolate0;
      return function() {
        var string0 = styleValue(this, name);
        return string0 === string1 ? null
            : string0 === string00 ? interpolate0
            : interpolate0 = interpolate(string00 = string0, value1);
      };
    }

    function styleFunction$1(name, interpolate, value) {
      var string00,
          string10,
          interpolate0;
      return function() {
        var string0 = styleValue(this, name),
            value1 = value(this),
            string1 = value1 + "";
        if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
        return string0 === string1 ? null
            : string0 === string00 && string1 === string10 ? interpolate0
            : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
      };
    }

    function styleMaybeRemove(id, name) {
      var on0, on1, listener0, key = "style." + name, event = "end." + key, remove;
      return function() {
        var schedule = set$1(this, id),
            on = schedule.on,
            listener = schedule.value[key] == null ? remove || (remove = styleRemove$1(name)) : undefined;

        // If this node shared a dispatch with the previous node,
        // just assign the updated shared dispatch and we’re done!
        // Otherwise, copy-on-write.
        if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);

        schedule.on = on1;
      };
    }

    function transition_style(name, value, priority) {
      var i = (name += "") === "transform" ? interpolateTransformCss : interpolate;
      return value == null ? this
          .styleTween(name, styleNull(name, i))
          .on("end.style." + name, styleRemove$1(name))
        : typeof value === "function" ? this
          .styleTween(name, styleFunction$1(name, i, tweenValue(this, "style." + name, value)))
          .each(styleMaybeRemove(this._id, name))
        : this
          .styleTween(name, styleConstant$1(name, i, value), priority)
          .on("end.style." + name, null);
    }

    function styleInterpolate(name, i, priority) {
      return function(t) {
        this.style.setProperty(name, i(t), priority);
      };
    }

    function styleTween(name, value, priority) {
      var t, i0;
      function tween() {
        var i = value.apply(this, arguments);
        if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
        return t;
      }
      tween._value = value;
      return tween;
    }

    function transition_styleTween(name, value, priority) {
      var key = "style." + (name += "");
      if (arguments.length < 2) return (key = this.tween(key)) && key._value;
      if (value == null) return this.tween(key, null);
      if (typeof value !== "function") throw new Error;
      return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
    }

    function textConstant$1(value) {
      return function() {
        this.textContent = value;
      };
    }

    function textFunction$1(value) {
      return function() {
        var value1 = value(this);
        this.textContent = value1 == null ? "" : value1;
      };
    }

    function transition_text(value) {
      return this.tween("text", typeof value === "function"
          ? textFunction$1(tweenValue(this, "text", value))
          : textConstant$1(value == null ? "" : value + ""));
    }

    function transition_transition() {
      var name = this._name,
          id0 = this._id,
          id1 = newId();

      for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            var inherit = get$1(node, id0);
            schedule(node, name, id1, i, group, {
              time: inherit.time + inherit.delay + inherit.duration,
              delay: 0,
              duration: inherit.duration,
              ease: inherit.ease
            });
          }
        }
      }

      return new Transition(groups, this._parents, name, id1);
    }

    function transition_end() {
      var on0, on1, that = this, id = that._id, size = that.size();
      return new Promise(function(resolve, reject) {
        var cancel = {value: reject},
            end = {value: function() { if (--size === 0) resolve(); }};

        that.each(function() {
          var schedule = set$1(this, id),
              on = schedule.on;

          // If this node shared a dispatch with the previous node,
          // just assign the updated shared dispatch and we’re done!
          // Otherwise, copy-on-write.
          if (on !== on0) {
            on1 = (on0 = on).copy();
            on1._.cancel.push(cancel);
            on1._.interrupt.push(cancel);
            on1._.end.push(end);
          }

          schedule.on = on1;
        });
      });
    }

    var id = 0;

    function Transition(groups, parents, name, id) {
      this._groups = groups;
      this._parents = parents;
      this._name = name;
      this._id = id;
    }

    function transition(name) {
      return selection().transition(name);
    }

    function newId() {
      return ++id;
    }

    var selection_prototype = selection.prototype;

    Transition.prototype = transition.prototype = {
      constructor: Transition,
      select: transition_select,
      selectAll: transition_selectAll,
      filter: transition_filter,
      merge: transition_merge,
      selection: transition_selection,
      transition: transition_transition,
      call: selection_prototype.call,
      nodes: selection_prototype.nodes,
      node: selection_prototype.node,
      size: selection_prototype.size,
      empty: selection_prototype.empty,
      each: selection_prototype.each,
      on: transition_on,
      attr: transition_attr,
      attrTween: transition_attrTween,
      style: transition_style,
      styleTween: transition_styleTween,
      text: transition_text,
      remove: transition_remove,
      tween: transition_tween,
      delay: transition_delay,
      duration: transition_duration,
      ease: transition_ease,
      end: transition_end
    };

    function cubicInOut(t) {
      return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
    }

    var defaultTiming = {
      time: null, // Set on use.
      delay: 0,
      duration: 250,
      ease: cubicInOut
    };

    function inherit(node, id) {
      var timing;
      while (!(timing = node.__transition) || !(timing = timing[id])) {
        if (!(node = node.parentNode)) {
          return defaultTiming.time = now(), defaultTiming;
        }
      }
      return timing;
    }

    function selection_transition(name) {
      var id,
          timing;

      if (name instanceof Transition) {
        id = name._id, name = name._name;
      } else {
        id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
      }

      for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            schedule(node, name, id, i, group, timing || inherit(node, id));
          }
        }
      }

      return new Transition(groups, this._parents, name, id);
    }

    selection.prototype.interrupt = selection_interrupt;
    selection.prototype.transition = selection_transition;

    var prefix = "$";

    function Map$1() {}

    Map$1.prototype = map.prototype = {
      constructor: Map$1,
      has: function(key) {
        return (prefix + key) in this;
      },
      get: function(key) {
        return this[prefix + key];
      },
      set: function(key, value) {
        this[prefix + key] = value;
        return this;
      },
      remove: function(key) {
        var property = prefix + key;
        return property in this && delete this[property];
      },
      clear: function() {
        for (var property in this) if (property[0] === prefix) delete this[property];
      },
      keys: function() {
        var keys = [];
        for (var property in this) if (property[0] === prefix) keys.push(property.slice(1));
        return keys;
      },
      values: function() {
        var values = [];
        for (var property in this) if (property[0] === prefix) values.push(this[property]);
        return values;
      },
      entries: function() {
        var entries = [];
        for (var property in this) if (property[0] === prefix) entries.push({key: property.slice(1), value: this[property]});
        return entries;
      },
      size: function() {
        var size = 0;
        for (var property in this) if (property[0] === prefix) ++size;
        return size;
      },
      empty: function() {
        for (var property in this) if (property[0] === prefix) return false;
        return true;
      },
      each: function(f) {
        for (var property in this) if (property[0] === prefix) f(this[property], property.slice(1), this);
      }
    };

    function map(object, f) {
      var map = new Map$1;

      // Copy constructor.
      if (object instanceof Map$1) object.each(function(value, key) { map.set(key, value); });

      // Index array by numeric index or specified key function.
      else if (Array.isArray(object)) {
        var i = -1,
            n = object.length,
            o;

        if (f == null) while (++i < n) map.set(i, object[i]);
        else while (++i < n) map.set(f(o = object[i], i, object), o);
      }

      // Convert object to map.
      else if (object) for (var key in object) map.set(key, object[key]);

      return map;
    }

    function Set$1() {}

    var proto = map.prototype;

    Set$1.prototype = set$2.prototype = {
      constructor: Set$1,
      has: proto.has,
      add: function(value) {
        value += "";
        this[prefix + value] = value;
        return this;
      },
      remove: proto.remove,
      clear: proto.clear,
      values: proto.keys,
      size: proto.size,
      empty: proto.empty,
      each: proto.each
    };

    function set$2(object, f) {
      var set = new Set$1;

      // Copy constructor.
      if (object instanceof Set$1) object.each(function(value) { set.add(value); });

      // Otherwise, assume it’s an array.
      else if (object) {
        var i = -1, n = object.length;
        if (f == null) while (++i < n) set.add(object[i]);
        else while (++i < n) set.add(f(object[i], i, object));
      }

      return set;
    }

    var EOL = {},
        EOF = {},
        QUOTE = 34,
        NEWLINE = 10,
        RETURN = 13;

    function objectConverter(columns) {
      return new Function("d", "return {" + columns.map(function(name, i) {
        return JSON.stringify(name) + ": d[" + i + "]";
      }).join(",") + "}");
    }

    function customConverter(columns, f) {
      var object = objectConverter(columns);
      return function(row, i) {
        return f(object(row), i, columns);
      };
    }

    // Compute unique columns in order of discovery.
    function inferColumns(rows) {
      var columnSet = Object.create(null),
          columns = [];

      rows.forEach(function(row) {
        for (var column in row) {
          if (!(column in columnSet)) {
            columns.push(columnSet[column] = column);
          }
        }
      });

      return columns;
    }

    function pad(value, width) {
      var s = value + "", length = s.length;
      return length < width ? new Array(width - length + 1).join(0) + s : s;
    }

    function formatYear(year) {
      return year < 0 ? "-" + pad(-year, 6)
        : year > 9999 ? "+" + pad(year, 6)
        : pad(year, 4);
    }

    function formatDate(date) {
      var hours = date.getUTCHours(),
          minutes = date.getUTCMinutes(),
          seconds = date.getUTCSeconds(),
          milliseconds = date.getUTCMilliseconds();
      return isNaN(date) ? "Invalid Date"
          : formatYear(date.getUTCFullYear()) + "-" + pad(date.getUTCMonth() + 1, 2) + "-" + pad(date.getUTCDate(), 2)
          + (milliseconds ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "." + pad(milliseconds, 3) + "Z"
          : seconds ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "Z"
          : minutes || hours ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + "Z"
          : "");
    }

    function dsvFormat(delimiter) {
      var reFormat = new RegExp("[\"" + delimiter + "\n\r]"),
          DELIMITER = delimiter.charCodeAt(0);

      function parse(text, f) {
        var convert, columns, rows = parseRows(text, function(row, i) {
          if (convert) return convert(row, i - 1);
          columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
        });
        rows.columns = columns || [];
        return rows;
      }

      function parseRows(text, f) {
        var rows = [], // output rows
            N = text.length,
            I = 0, // current character index
            n = 0, // current line number
            t, // current token
            eof = N <= 0, // current token followed by EOF?
            eol = false; // current token followed by EOL?

        // Strip the trailing newline.
        if (text.charCodeAt(N - 1) === NEWLINE) --N;
        if (text.charCodeAt(N - 1) === RETURN) --N;

        function token() {
          if (eof) return EOF;
          if (eol) return eol = false, EOL;

          // Unescape quotes.
          var i, j = I, c;
          if (text.charCodeAt(j) === QUOTE) {
            while (I++ < N && text.charCodeAt(I) !== QUOTE || text.charCodeAt(++I) === QUOTE);
            if ((i = I) >= N) eof = true;
            else if ((c = text.charCodeAt(I++)) === NEWLINE) eol = true;
            else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
            return text.slice(j + 1, i - 1).replace(/""/g, "\"");
          }

          // Find next delimiter or newline.
          while (I < N) {
            if ((c = text.charCodeAt(i = I++)) === NEWLINE) eol = true;
            else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
            else if (c !== DELIMITER) continue;
            return text.slice(j, i);
          }

          // Return last token before EOF.
          return eof = true, text.slice(j, N);
        }

        while ((t = token()) !== EOF) {
          var row = [];
          while (t !== EOL && t !== EOF) row.push(t), t = token();
          if (f && (row = f(row, n++)) == null) continue;
          rows.push(row);
        }

        return rows;
      }

      function preformatBody(rows, columns) {
        return rows.map(function(row) {
          return columns.map(function(column) {
            return formatValue(row[column]);
          }).join(delimiter);
        });
      }

      function format(rows, columns) {
        if (columns == null) columns = inferColumns(rows);
        return [columns.map(formatValue).join(delimiter)].concat(preformatBody(rows, columns)).join("\n");
      }

      function formatBody(rows, columns) {
        if (columns == null) columns = inferColumns(rows);
        return preformatBody(rows, columns).join("\n");
      }

      function formatRows(rows) {
        return rows.map(formatRow).join("\n");
      }

      function formatRow(row) {
        return row.map(formatValue).join(delimiter);
      }

      function formatValue(value) {
        return value == null ? ""
            : value instanceof Date ? formatDate(value)
            : reFormat.test(value += "") ? "\"" + value.replace(/"/g, "\"\"") + "\""
            : value;
      }

      return {
        parse: parse,
        parseRows: parseRows,
        format: format,
        formatBody: formatBody,
        formatRows: formatRows
      };
    }

    var csv = dsvFormat(",");

    var tsv = dsvFormat("\t");

    function tree_add(d) {
      var x = +this._x.call(null, d),
          y = +this._y.call(null, d);
      return add(this.cover(x, y), x, y, d);
    }

    function add(tree, x, y, d) {
      if (isNaN(x) || isNaN(y)) return tree; // ignore invalid points

      var parent,
          node = tree._root,
          leaf = {data: d},
          x0 = tree._x0,
          y0 = tree._y0,
          x1 = tree._x1,
          y1 = tree._y1,
          xm,
          ym,
          xp,
          yp,
          right,
          bottom,
          i,
          j;

      // If the tree is empty, initialize the root as a leaf.
      if (!node) return tree._root = leaf, tree;

      // Find the existing leaf for the new point, or add it.
      while (node.length) {
        if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
        if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
        if (parent = node, !(node = node[i = bottom << 1 | right])) return parent[i] = leaf, tree;
      }

      // Is the new point is exactly coincident with the existing point?
      xp = +tree._x.call(null, node.data);
      yp = +tree._y.call(null, node.data);
      if (x === xp && y === yp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;

      // Otherwise, split the leaf node until the old and new point are separated.
      do {
        parent = parent ? parent[i] = new Array(4) : tree._root = new Array(4);
        if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
        if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
      } while ((i = bottom << 1 | right) === (j = (yp >= ym) << 1 | (xp >= xm)));
      return parent[j] = node, parent[i] = leaf, tree;
    }

    function addAll(data) {
      var d, i, n = data.length,
          x,
          y,
          xz = new Array(n),
          yz = new Array(n),
          x0 = Infinity,
          y0 = Infinity,
          x1 = -Infinity,
          y1 = -Infinity;

      // Compute the points and their extent.
      for (i = 0; i < n; ++i) {
        if (isNaN(x = +this._x.call(null, d = data[i])) || isNaN(y = +this._y.call(null, d))) continue;
        xz[i] = x;
        yz[i] = y;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }

      // If there were no (valid) points, abort.
      if (x0 > x1 || y0 > y1) return this;

      // Expand the tree to cover the new points.
      this.cover(x0, y0).cover(x1, y1);

      // Add the new points.
      for (i = 0; i < n; ++i) {
        add(this, xz[i], yz[i], data[i]);
      }

      return this;
    }

    function tree_cover(x, y) {
      if (isNaN(x = +x) || isNaN(y = +y)) return this; // ignore invalid points

      var x0 = this._x0,
          y0 = this._y0,
          x1 = this._x1,
          y1 = this._y1;

      // If the quadtree has no extent, initialize them.
      // Integer extent are necessary so that if we later double the extent,
      // the existing quadrant boundaries don’t change due to floating point error!
      if (isNaN(x0)) {
        x1 = (x0 = Math.floor(x)) + 1;
        y1 = (y0 = Math.floor(y)) + 1;
      }

      // Otherwise, double repeatedly to cover.
      else {
        var z = x1 - x0,
            node = this._root,
            parent,
            i;

        while (x0 > x || x >= x1 || y0 > y || y >= y1) {
          i = (y < y0) << 1 | (x < x0);
          parent = new Array(4), parent[i] = node, node = parent, z *= 2;
          switch (i) {
            case 0: x1 = x0 + z, y1 = y0 + z; break;
            case 1: x0 = x1 - z, y1 = y0 + z; break;
            case 2: x1 = x0 + z, y0 = y1 - z; break;
            case 3: x0 = x1 - z, y0 = y1 - z; break;
          }
        }

        if (this._root && this._root.length) this._root = node;
      }

      this._x0 = x0;
      this._y0 = y0;
      this._x1 = x1;
      this._y1 = y1;
      return this;
    }

    function tree_data() {
      var data = [];
      this.visit(function(node) {
        if (!node.length) do data.push(node.data); while (node = node.next)
      });
      return data;
    }

    function tree_extent(_) {
      return arguments.length
          ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1])
          : isNaN(this._x0) ? undefined : [[this._x0, this._y0], [this._x1, this._y1]];
    }

    function Quad(node, x0, y0, x1, y1) {
      this.node = node;
      this.x0 = x0;
      this.y0 = y0;
      this.x1 = x1;
      this.y1 = y1;
    }

    function tree_find(x, y, radius) {
      var data,
          x0 = this._x0,
          y0 = this._y0,
          x1,
          y1,
          x2,
          y2,
          x3 = this._x1,
          y3 = this._y1,
          quads = [],
          node = this._root,
          q,
          i;

      if (node) quads.push(new Quad(node, x0, y0, x3, y3));
      if (radius == null) radius = Infinity;
      else {
        x0 = x - radius, y0 = y - radius;
        x3 = x + radius, y3 = y + radius;
        radius *= radius;
      }

      while (q = quads.pop()) {

        // Stop searching if this quadrant can’t contain a closer node.
        if (!(node = q.node)
            || (x1 = q.x0) > x3
            || (y1 = q.y0) > y3
            || (x2 = q.x1) < x0
            || (y2 = q.y1) < y0) continue;

        // Bisect the current quadrant.
        if (node.length) {
          var xm = (x1 + x2) / 2,
              ym = (y1 + y2) / 2;

          quads.push(
            new Quad(node[3], xm, ym, x2, y2),
            new Quad(node[2], x1, ym, xm, y2),
            new Quad(node[1], xm, y1, x2, ym),
            new Quad(node[0], x1, y1, xm, ym)
          );

          // Visit the closest quadrant first.
          if (i = (y >= ym) << 1 | (x >= xm)) {
            q = quads[quads.length - 1];
            quads[quads.length - 1] = quads[quads.length - 1 - i];
            quads[quads.length - 1 - i] = q;
          }
        }

        // Visit this point. (Visiting coincident points isn’t necessary!)
        else {
          var dx = x - +this._x.call(null, node.data),
              dy = y - +this._y.call(null, node.data),
              d2 = dx * dx + dy * dy;
          if (d2 < radius) {
            var d = Math.sqrt(radius = d2);
            x0 = x - d, y0 = y - d;
            x3 = x + d, y3 = y + d;
            data = node.data;
          }
        }
      }

      return data;
    }

    function tree_remove(d) {
      if (isNaN(x = +this._x.call(null, d)) || isNaN(y = +this._y.call(null, d))) return this; // ignore invalid points

      var parent,
          node = this._root,
          retainer,
          previous,
          next,
          x0 = this._x0,
          y0 = this._y0,
          x1 = this._x1,
          y1 = this._y1,
          x,
          y,
          xm,
          ym,
          right,
          bottom,
          i,
          j;

      // If the tree is empty, initialize the root as a leaf.
      if (!node) return this;

      // Find the leaf node for the point.
      // While descending, also retain the deepest parent with a non-removed sibling.
      if (node.length) while (true) {
        if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
        if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
        if (!(parent = node, node = node[i = bottom << 1 | right])) return this;
        if (!node.length) break;
        if (parent[(i + 1) & 3] || parent[(i + 2) & 3] || parent[(i + 3) & 3]) retainer = parent, j = i;
      }

      // Find the point to remove.
      while (node.data !== d) if (!(previous = node, node = node.next)) return this;
      if (next = node.next) delete node.next;

      // If there are multiple coincident points, remove just the point.
      if (previous) return (next ? previous.next = next : delete previous.next), this;

      // If this is the root point, remove it.
      if (!parent) return this._root = next, this;

      // Remove this leaf.
      next ? parent[i] = next : delete parent[i];

      // If the parent now contains exactly one leaf, collapse superfluous parents.
      if ((node = parent[0] || parent[1] || parent[2] || parent[3])
          && node === (parent[3] || parent[2] || parent[1] || parent[0])
          && !node.length) {
        if (retainer) retainer[j] = node;
        else this._root = node;
      }

      return this;
    }

    function removeAll(data) {
      for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
      return this;
    }

    function tree_root() {
      return this._root;
    }

    function tree_size() {
      var size = 0;
      this.visit(function(node) {
        if (!node.length) do ++size; while (node = node.next)
      });
      return size;
    }

    function tree_visit(callback) {
      var quads = [], q, node = this._root, child, x0, y0, x1, y1;
      if (node) quads.push(new Quad(node, this._x0, this._y0, this._x1, this._y1));
      while (q = quads.pop()) {
        if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1) && node.length) {
          var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
          if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
          if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
          if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
          if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
        }
      }
      return this;
    }

    function tree_visitAfter(callback) {
      var quads = [], next = [], q;
      if (this._root) quads.push(new Quad(this._root, this._x0, this._y0, this._x1, this._y1));
      while (q = quads.pop()) {
        var node = q.node;
        if (node.length) {
          var child, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
          if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
          if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
          if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
          if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
        }
        next.push(q);
      }
      while (q = next.pop()) {
        callback(q.node, q.x0, q.y0, q.x1, q.y1);
      }
      return this;
    }

    function defaultX(d) {
      return d[0];
    }

    function tree_x(_) {
      return arguments.length ? (this._x = _, this) : this._x;
    }

    function defaultY(d) {
      return d[1];
    }

    function tree_y(_) {
      return arguments.length ? (this._y = _, this) : this._y;
    }

    function quadtree(nodes, x, y) {
      var tree = new Quadtree(x == null ? defaultX : x, y == null ? defaultY : y, NaN, NaN, NaN, NaN);
      return nodes == null ? tree : tree.addAll(nodes);
    }

    function Quadtree(x, y, x0, y0, x1, y1) {
      this._x = x;
      this._y = y;
      this._x0 = x0;
      this._y0 = y0;
      this._x1 = x1;
      this._y1 = y1;
      this._root = undefined;
    }

    function leaf_copy(leaf) {
      var copy = {data: leaf.data}, next = copy;
      while (leaf = leaf.next) next = next.next = {data: leaf.data};
      return copy;
    }

    var treeProto = quadtree.prototype = Quadtree.prototype;

    treeProto.copy = function() {
      var copy = new Quadtree(this._x, this._y, this._x0, this._y0, this._x1, this._y1),
          node = this._root,
          nodes,
          child;

      if (!node) return copy;

      if (!node.length) return copy._root = leaf_copy(node), copy;

      nodes = [{source: node, target: copy._root = new Array(4)}];
      while (node = nodes.pop()) {
        for (var i = 0; i < 4; ++i) {
          if (child = node.source[i]) {
            if (child.length) nodes.push({source: child, target: node.target[i] = new Array(4)});
            else node.target[i] = leaf_copy(child);
          }
        }
      }

      return copy;
    };

    treeProto.add = tree_add;
    treeProto.addAll = addAll;
    treeProto.cover = tree_cover;
    treeProto.data = tree_data;
    treeProto.extent = tree_extent;
    treeProto.find = tree_find;
    treeProto.remove = tree_remove;
    treeProto.removeAll = removeAll;
    treeProto.root = tree_root;
    treeProto.size = tree_size;
    treeProto.visit = tree_visit;
    treeProto.visitAfter = tree_visitAfter;
    treeProto.x = tree_x;
    treeProto.y = tree_y;

    // Computes the decimal coefficient and exponent of the specified number x with
    // significant digits p, where x is positive and p is in [1, 21] or undefined.
    // For example, formatDecimal(1.23) returns ["123", 0].
    function formatDecimal(x, p) {
      if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
      var i, coefficient = x.slice(0, i);

      // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
      // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
      return [
        coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
        +x.slice(i + 1)
      ];
    }

    function exponent(x) {
      return x = formatDecimal(Math.abs(x)), x ? x[1] : NaN;
    }

    function formatGroup(grouping, thousands) {
      return function(value, width) {
        var i = value.length,
            t = [],
            j = 0,
            g = grouping[0],
            length = 0;

        while (i > 0 && g > 0) {
          if (length + g + 1 > width) g = Math.max(1, width - length);
          t.push(value.substring(i -= g, i + g));
          if ((length += g + 1) > width) break;
          g = grouping[j = (j + 1) % grouping.length];
        }

        return t.reverse().join(thousands);
      };
    }

    function formatNumerals(numerals) {
      return function(value) {
        return value.replace(/[0-9]/g, function(i) {
          return numerals[+i];
        });
      };
    }

    // [[fill]align][sign][symbol][0][width][,][.precision][~][type]
    var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

    function formatSpecifier(specifier) {
      if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
      var match;
      return new FormatSpecifier({
        fill: match[1],
        align: match[2],
        sign: match[3],
        symbol: match[4],
        zero: match[5],
        width: match[6],
        comma: match[7],
        precision: match[8] && match[8].slice(1),
        trim: match[9],
        type: match[10]
      });
    }

    formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

    function FormatSpecifier(specifier) {
      this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
      this.align = specifier.align === undefined ? ">" : specifier.align + "";
      this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
      this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
      this.zero = !!specifier.zero;
      this.width = specifier.width === undefined ? undefined : +specifier.width;
      this.comma = !!specifier.comma;
      this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
      this.trim = !!specifier.trim;
      this.type = specifier.type === undefined ? "" : specifier.type + "";
    }

    FormatSpecifier.prototype.toString = function() {
      return this.fill
          + this.align
          + this.sign
          + this.symbol
          + (this.zero ? "0" : "")
          + (this.width === undefined ? "" : Math.max(1, this.width | 0))
          + (this.comma ? "," : "")
          + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
          + (this.trim ? "~" : "")
          + this.type;
    };

    // Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
    function formatTrim(s) {
      out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
        switch (s[i]) {
          case ".": i0 = i1 = i; break;
          case "0": if (i0 === 0) i0 = i; i1 = i; break;
          default: if (i0 > 0) { if (!+s[i]) break out; i0 = 0; } break;
        }
      }
      return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
    }

    var prefixExponent;

    function formatPrefixAuto(x, p) {
      var d = formatDecimal(x, p);
      if (!d) return x + "";
      var coefficient = d[0],
          exponent = d[1],
          i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
          n = coefficient.length;
      return i === n ? coefficient
          : i > n ? coefficient + new Array(i - n + 1).join("0")
          : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
          : "0." + new Array(1 - i).join("0") + formatDecimal(x, Math.max(0, p + i - 1))[0]; // less than 1y!
    }

    function formatRounded(x, p) {
      var d = formatDecimal(x, p);
      if (!d) return x + "";
      var coefficient = d[0],
          exponent = d[1];
      return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
          : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
          : coefficient + new Array(exponent - coefficient.length + 2).join("0");
    }

    var formatTypes = {
      "%": function(x, p) { return (x * 100).toFixed(p); },
      "b": function(x) { return Math.round(x).toString(2); },
      "c": function(x) { return x + ""; },
      "d": function(x) { return Math.round(x).toString(10); },
      "e": function(x, p) { return x.toExponential(p); },
      "f": function(x, p) { return x.toFixed(p); },
      "g": function(x, p) { return x.toPrecision(p); },
      "o": function(x) { return Math.round(x).toString(8); },
      "p": function(x, p) { return formatRounded(x * 100, p); },
      "r": formatRounded,
      "s": formatPrefixAuto,
      "X": function(x) { return Math.round(x).toString(16).toUpperCase(); },
      "x": function(x) { return Math.round(x).toString(16); }
    };

    function identity$2(x) {
      return x;
    }

    var map$1 = Array.prototype.map,
        prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

    function formatLocale(locale) {
      var group = locale.grouping === undefined || locale.thousands === undefined ? identity$2 : formatGroup(map$1.call(locale.grouping, Number), locale.thousands + ""),
          currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
          currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
          decimal = locale.decimal === undefined ? "." : locale.decimal + "",
          numerals = locale.numerals === undefined ? identity$2 : formatNumerals(map$1.call(locale.numerals, String)),
          percent = locale.percent === undefined ? "%" : locale.percent + "",
          minus = locale.minus === undefined ? "-" : locale.minus + "",
          nan = locale.nan === undefined ? "NaN" : locale.nan + "";

      function newFormat(specifier) {
        specifier = formatSpecifier(specifier);

        var fill = specifier.fill,
            align = specifier.align,
            sign = specifier.sign,
            symbol = specifier.symbol,
            zero = specifier.zero,
            width = specifier.width,
            comma = specifier.comma,
            precision = specifier.precision,
            trim = specifier.trim,
            type = specifier.type;

        // The "n" type is an alias for ",g".
        if (type === "n") comma = true, type = "g";

        // The "" type, and any invalid type, is an alias for ".12~g".
        else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

        // If zero fill is specified, padding goes after sign and before digits.
        if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

        // Compute the prefix and suffix.
        // For SI-prefix, the suffix is lazily computed.
        var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
            suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

        // What format function should we use?
        // Is this an integer type?
        // Can this type generate exponential notation?
        var formatType = formatTypes[type],
            maybeSuffix = /[defgprs%]/.test(type);

        // Set the default precision if not specified,
        // or clamp the specified precision to the supported range.
        // For significant precision, it must be in [1, 21].
        // For fixed precision, it must be in [0, 20].
        precision = precision === undefined ? 6
            : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
            : Math.max(0, Math.min(20, precision));

        function format(value) {
          var valuePrefix = prefix,
              valueSuffix = suffix,
              i, n, c;

          if (type === "c") {
            valueSuffix = formatType(value) + valueSuffix;
            value = "";
          } else {
            value = +value;

            // Perform the initial formatting.
            var valueNegative = value < 0;
            value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

            // Trim insignificant zeros.
            if (trim) value = formatTrim(value);

            // If a negative value rounds to zero during formatting, treat as positive.
            if (valueNegative && +value === 0) valueNegative = false;

            // Compute the prefix and suffix.
            valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;

            valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

            // Break the formatted value into the integer “value” part that can be
            // grouped, and fractional or exponential “suffix” part that is not.
            if (maybeSuffix) {
              i = -1, n = value.length;
              while (++i < n) {
                if (c = value.charCodeAt(i), 48 > c || c > 57) {
                  valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                  value = value.slice(0, i);
                  break;
                }
              }
            }
          }

          // If the fill character is not "0", grouping is applied before padding.
          if (comma && !zero) value = group(value, Infinity);

          // Compute the padding.
          var length = valuePrefix.length + value.length + valueSuffix.length,
              padding = length < width ? new Array(width - length + 1).join(fill) : "";

          // If the fill character is "0", grouping is applied after padding.
          if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

          // Reconstruct the final output based on the desired alignment.
          switch (align) {
            case "<": value = valuePrefix + value + valueSuffix + padding; break;
            case "=": value = valuePrefix + padding + value + valueSuffix; break;
            case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
            default: value = padding + valuePrefix + value + valueSuffix; break;
          }

          return numerals(value);
        }

        format.toString = function() {
          return specifier + "";
        };

        return format;
      }

      function formatPrefix(specifier, value) {
        var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
            e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
            k = Math.pow(10, -e),
            prefix = prefixes[8 + e / 3];
        return function(value) {
          return f(k * value) + prefix;
        };
      }

      return {
        format: newFormat,
        formatPrefix: formatPrefix
      };
    }

    var locale;
    var format;
    var formatPrefix;

    defaultLocale({
      decimal: ".",
      thousands: ",",
      grouping: [3],
      currency: ["$", ""],
      minus: "-"
    });

    function defaultLocale(definition) {
      locale = formatLocale(definition);
      format = locale.format;
      formatPrefix = locale.formatPrefix;
      return locale;
    }

    function precisionFixed(step) {
      return Math.max(0, -exponent(Math.abs(step)));
    }

    function precisionPrefix(step, value) {
      return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
    }

    function precisionRound(step, max) {
      step = Math.abs(step), max = Math.abs(max) - step;
      return Math.max(0, exponent(max) - exponent(step)) + 1;
    }

    // Adds floating point numbers with twice the normal precision.
    // Reference: J. R. Shewchuk, Adaptive Precision Floating-Point Arithmetic and
    // Fast Robust Geometric Predicates, Discrete & Computational Geometry 18(3)
    // 305–363 (1997).
    // Code adapted from GeographicLib by Charles F. F. Karney,
    // http://geographiclib.sourceforge.net/

    function adder() {
      return new Adder;
    }

    function Adder() {
      this.reset();
    }

    Adder.prototype = {
      constructor: Adder,
      reset: function() {
        this.s = // rounded value
        this.t = 0; // exact error
      },
      add: function(y) {
        add$1(temp, y, this.t);
        add$1(this, temp.s, this.s);
        if (this.s) this.t += temp.t;
        else this.s = temp.t;
      },
      valueOf: function() {
        return this.s;
      }
    };

    var temp = new Adder;

    function add$1(adder, a, b) {
      var x = adder.s = a + b,
          bv = x - a,
          av = x - bv;
      adder.t = (a - av) + (b - bv);
    }

    var areaRingSum = adder();

    var areaSum = adder();

    var deltaSum = adder();

    var sum = adder();

    var lengthSum = adder();

    var areaSum$1 = adder(),
        areaRingSum$1 = adder();

    var lengthSum$1 = adder();

    function count(node) {
      var sum = 0,
          children = node.children,
          i = children && children.length;
      if (!i) sum = 1;
      else while (--i >= 0) sum += children[i].value;
      node.value = sum;
    }

    function node_count() {
      return this.eachAfter(count);
    }

    function node_each(callback) {
      var node = this, current, next = [node], children, i, n;
      do {
        current = next.reverse(), next = [];
        while (node = current.pop()) {
          callback(node), children = node.children;
          if (children) for (i = 0, n = children.length; i < n; ++i) {
            next.push(children[i]);
          }
        }
      } while (next.length);
      return this;
    }

    function node_eachBefore(callback) {
      var node = this, nodes = [node], children, i;
      while (node = nodes.pop()) {
        callback(node), children = node.children;
        if (children) for (i = children.length - 1; i >= 0; --i) {
          nodes.push(children[i]);
        }
      }
      return this;
    }

    function node_eachAfter(callback) {
      var node = this, nodes = [node], next = [], children, i, n;
      while (node = nodes.pop()) {
        next.push(node), children = node.children;
        if (children) for (i = 0, n = children.length; i < n; ++i) {
          nodes.push(children[i]);
        }
      }
      while (node = next.pop()) {
        callback(node);
      }
      return this;
    }

    function node_sum(value) {
      return this.eachAfter(function(node) {
        var sum = +value(node.data) || 0,
            children = node.children,
            i = children && children.length;
        while (--i >= 0) sum += children[i].value;
        node.value = sum;
      });
    }

    function node_sort(compare) {
      return this.eachBefore(function(node) {
        if (node.children) {
          node.children.sort(compare);
        }
      });
    }

    function node_path(end) {
      var start = this,
          ancestor = leastCommonAncestor(start, end),
          nodes = [start];
      while (start !== ancestor) {
        start = start.parent;
        nodes.push(start);
      }
      var k = nodes.length;
      while (end !== ancestor) {
        nodes.splice(k, 0, end);
        end = end.parent;
      }
      return nodes;
    }

    function leastCommonAncestor(a, b) {
      if (a === b) return a;
      var aNodes = a.ancestors(),
          bNodes = b.ancestors(),
          c = null;
      a = aNodes.pop();
      b = bNodes.pop();
      while (a === b) {
        c = a;
        a = aNodes.pop();
        b = bNodes.pop();
      }
      return c;
    }

    function node_ancestors() {
      var node = this, nodes = [node];
      while (node = node.parent) {
        nodes.push(node);
      }
      return nodes;
    }

    function node_descendants() {
      var nodes = [];
      this.each(function(node) {
        nodes.push(node);
      });
      return nodes;
    }

    function node_leaves() {
      var leaves = [];
      this.eachBefore(function(node) {
        if (!node.children) {
          leaves.push(node);
        }
      });
      return leaves;
    }

    function node_links() {
      var root = this, links = [];
      root.each(function(node) {
        if (node !== root) { // Don’t include the root’s parent, if any.
          links.push({source: node.parent, target: node});
        }
      });
      return links;
    }

    function hierarchy(data, children) {
      var root = new Node(data),
          valued = +data.value && (root.value = data.value),
          node,
          nodes = [root],
          child,
          childs,
          i,
          n;

      if (children == null) children = defaultChildren;

      while (node = nodes.pop()) {
        if (valued) node.value = +node.data.value;
        if ((childs = children(node.data)) && (n = childs.length)) {
          node.children = new Array(n);
          for (i = n - 1; i >= 0; --i) {
            nodes.push(child = node.children[i] = new Node(childs[i]));
            child.parent = node;
            child.depth = node.depth + 1;
          }
        }
      }

      return root.eachBefore(computeHeight);
    }

    function node_copy() {
      return hierarchy(this).eachBefore(copyData);
    }

    function defaultChildren(d) {
      return d.children;
    }

    function copyData(node) {
      node.data = node.data.data;
    }

    function computeHeight(node) {
      var height = 0;
      do node.height = height;
      while ((node = node.parent) && (node.height < ++height));
    }

    function Node(data) {
      this.data = data;
      this.depth =
      this.height = 0;
      this.parent = null;
    }

    Node.prototype = hierarchy.prototype = {
      constructor: Node,
      count: node_count,
      each: node_each,
      eachAfter: node_eachAfter,
      eachBefore: node_eachBefore,
      sum: node_sum,
      sort: node_sort,
      path: node_path,
      ancestors: node_ancestors,
      descendants: node_descendants,
      leaves: node_leaves,
      links: node_links,
      copy: node_copy
    };

    var slice$1 = Array.prototype.slice;

    function shuffle(array) {
      var m = array.length,
          t,
          i;

      while (m) {
        i = Math.random() * m-- | 0;
        t = array[m];
        array[m] = array[i];
        array[i] = t;
      }

      return array;
    }

    function enclose(circles) {
      var i = 0, n = (circles = shuffle(slice$1.call(circles))).length, B = [], p, e;

      while (i < n) {
        p = circles[i];
        if (e && enclosesWeak(e, p)) ++i;
        else e = encloseBasis(B = extendBasis(B, p)), i = 0;
      }

      return e;
    }

    function extendBasis(B, p) {
      var i, j;

      if (enclosesWeakAll(p, B)) return [p];

      // If we get here then B must have at least one element.
      for (i = 0; i < B.length; ++i) {
        if (enclosesNot(p, B[i])
            && enclosesWeakAll(encloseBasis2(B[i], p), B)) {
          return [B[i], p];
        }
      }

      // If we get here then B must have at least two elements.
      for (i = 0; i < B.length - 1; ++i) {
        for (j = i + 1; j < B.length; ++j) {
          if (enclosesNot(encloseBasis2(B[i], B[j]), p)
              && enclosesNot(encloseBasis2(B[i], p), B[j])
              && enclosesNot(encloseBasis2(B[j], p), B[i])
              && enclosesWeakAll(encloseBasis3(B[i], B[j], p), B)) {
            return [B[i], B[j], p];
          }
        }
      }

      // If we get here then something is very wrong.
      throw new Error;
    }

    function enclosesNot(a, b) {
      var dr = a.r - b.r, dx = b.x - a.x, dy = b.y - a.y;
      return dr < 0 || dr * dr < dx * dx + dy * dy;
    }

    function enclosesWeak(a, b) {
      var dr = a.r - b.r + 1e-6, dx = b.x - a.x, dy = b.y - a.y;
      return dr > 0 && dr * dr > dx * dx + dy * dy;
    }

    function enclosesWeakAll(a, B) {
      for (var i = 0; i < B.length; ++i) {
        if (!enclosesWeak(a, B[i])) {
          return false;
        }
      }
      return true;
    }

    function encloseBasis(B) {
      switch (B.length) {
        case 1: return encloseBasis1(B[0]);
        case 2: return encloseBasis2(B[0], B[1]);
        case 3: return encloseBasis3(B[0], B[1], B[2]);
      }
    }

    function encloseBasis1(a) {
      return {
        x: a.x,
        y: a.y,
        r: a.r
      };
    }

    function encloseBasis2(a, b) {
      var x1 = a.x, y1 = a.y, r1 = a.r,
          x2 = b.x, y2 = b.y, r2 = b.r,
          x21 = x2 - x1, y21 = y2 - y1, r21 = r2 - r1,
          l = Math.sqrt(x21 * x21 + y21 * y21);
      return {
        x: (x1 + x2 + x21 / l * r21) / 2,
        y: (y1 + y2 + y21 / l * r21) / 2,
        r: (l + r1 + r2) / 2
      };
    }

    function encloseBasis3(a, b, c) {
      var x1 = a.x, y1 = a.y, r1 = a.r,
          x2 = b.x, y2 = b.y, r2 = b.r,
          x3 = c.x, y3 = c.y, r3 = c.r,
          a2 = x1 - x2,
          a3 = x1 - x3,
          b2 = y1 - y2,
          b3 = y1 - y3,
          c2 = r2 - r1,
          c3 = r3 - r1,
          d1 = x1 * x1 + y1 * y1 - r1 * r1,
          d2 = d1 - x2 * x2 - y2 * y2 + r2 * r2,
          d3 = d1 - x3 * x3 - y3 * y3 + r3 * r3,
          ab = a3 * b2 - a2 * b3,
          xa = (b2 * d3 - b3 * d2) / (ab * 2) - x1,
          xb = (b3 * c2 - b2 * c3) / ab,
          ya = (a3 * d2 - a2 * d3) / (ab * 2) - y1,
          yb = (a2 * c3 - a3 * c2) / ab,
          A = xb * xb + yb * yb - 1,
          B = 2 * (r1 + xa * xb + ya * yb),
          C = xa * xa + ya * ya - r1 * r1,
          r = -(A ? (B + Math.sqrt(B * B - 4 * A * C)) / (2 * A) : C / B);
      return {
        x: x1 + xa + xb * r,
        y: y1 + ya + yb * r,
        r: r
      };
    }

    function place(b, a, c) {
      var dx = b.x - a.x, x, a2,
          dy = b.y - a.y, y, b2,
          d2 = dx * dx + dy * dy;
      if (d2) {
        a2 = a.r + c.r, a2 *= a2;
        b2 = b.r + c.r, b2 *= b2;
        if (a2 > b2) {
          x = (d2 + b2 - a2) / (2 * d2);
          y = Math.sqrt(Math.max(0, b2 / d2 - x * x));
          c.x = b.x - x * dx - y * dy;
          c.y = b.y - x * dy + y * dx;
        } else {
          x = (d2 + a2 - b2) / (2 * d2);
          y = Math.sqrt(Math.max(0, a2 / d2 - x * x));
          c.x = a.x + x * dx - y * dy;
          c.y = a.y + x * dy + y * dx;
        }
      } else {
        c.x = a.x + c.r;
        c.y = a.y;
      }
    }

    function intersects(a, b) {
      var dr = a.r + b.r - 1e-6, dx = b.x - a.x, dy = b.y - a.y;
      return dr > 0 && dr * dr > dx * dx + dy * dy;
    }

    function score(node) {
      var a = node._,
          b = node.next._,
          ab = a.r + b.r,
          dx = (a.x * b.r + b.x * a.r) / ab,
          dy = (a.y * b.r + b.y * a.r) / ab;
      return dx * dx + dy * dy;
    }

    function Node$1(circle) {
      this._ = circle;
      this.next = null;
      this.previous = null;
    }

    function packEnclose(circles) {
      if (!(n = circles.length)) return 0;

      var a, b, c, n, aa, ca, i, j, k, sj, sk;

      // Place the first circle.
      a = circles[0], a.x = 0, a.y = 0;
      if (!(n > 1)) return a.r;

      // Place the second circle.
      b = circles[1], a.x = -b.r, b.x = a.r, b.y = 0;
      if (!(n > 2)) return a.r + b.r;

      // Place the third circle.
      place(b, a, c = circles[2]);

      // Initialize the front-chain using the first three circles a, b and c.
      a = new Node$1(a), b = new Node$1(b), c = new Node$1(c);
      a.next = c.previous = b;
      b.next = a.previous = c;
      c.next = b.previous = a;

      // Attempt to place each remaining circle…
      pack: for (i = 3; i < n; ++i) {
        place(a._, b._, c = circles[i]), c = new Node$1(c);

        // Find the closest intersecting circle on the front-chain, if any.
        // “Closeness” is determined by linear distance along the front-chain.
        // “Ahead” or “behind” is likewise determined by linear distance.
        j = b.next, k = a.previous, sj = b._.r, sk = a._.r;
        do {
          if (sj <= sk) {
            if (intersects(j._, c._)) {
              b = j, a.next = b, b.previous = a, --i;
              continue pack;
            }
            sj += j._.r, j = j.next;
          } else {
            if (intersects(k._, c._)) {
              a = k, a.next = b, b.previous = a, --i;
              continue pack;
            }
            sk += k._.r, k = k.previous;
          }
        } while (j !== k.next);

        // Success! Insert the new circle c between a and b.
        c.previous = a, c.next = b, a.next = b.previous = b = c;

        // Compute the new closest circle pair to the centroid.
        aa = score(a);
        while ((c = c.next) !== b) {
          if ((ca = score(c)) < aa) {
            a = c, aa = ca;
          }
        }
        b = a.next;
      }

      // Compute the enclosing circle of the front chain.
      a = [b._], c = b; while ((c = c.next) !== b) a.push(c._); c = enclose(a);

      // Translate the circles to put the enclosing circle around the origin.
      for (i = 0; i < n; ++i) a = circles[i], a.x -= c.x, a.y -= c.y;

      return c.r;
    }

    function optional(f) {
      return f == null ? null : required(f);
    }

    function required(f) {
      if (typeof f !== "function") throw new Error;
      return f;
    }

    function constantZero() {
      return 0;
    }

    function constant$2(x) {
      return function() {
        return x;
      };
    }

    function defaultRadius(d) {
      return Math.sqrt(d.value);
    }

    function index() {
      var radius = null,
          dx = 1,
          dy = 1,
          padding = constantZero;

      function pack(root) {
        root.x = dx / 2, root.y = dy / 2;
        if (radius) {
          root.eachBefore(radiusLeaf(radius))
              .eachAfter(packChildren(padding, 0.5))
              .eachBefore(translateChild(1));
        } else {
          root.eachBefore(radiusLeaf(defaultRadius))
              .eachAfter(packChildren(constantZero, 1))
              .eachAfter(packChildren(padding, root.r / Math.min(dx, dy)))
              .eachBefore(translateChild(Math.min(dx, dy) / (2 * root.r)));
        }
        return root;
      }

      pack.radius = function(x) {
        return arguments.length ? (radius = optional(x), pack) : radius;
      };

      pack.size = function(x) {
        return arguments.length ? (dx = +x[0], dy = +x[1], pack) : [dx, dy];
      };

      pack.padding = function(x) {
        return arguments.length ? (padding = typeof x === "function" ? x : constant$2(+x), pack) : padding;
      };

      return pack;
    }

    function radiusLeaf(radius) {
      return function(node) {
        if (!node.children) {
          node.r = Math.max(0, +radius(node) || 0);
        }
      };
    }

    function packChildren(padding, k) {
      return function(node) {
        if (children = node.children) {
          var children,
              i,
              n = children.length,
              r = padding(node) * k || 0,
              e;

          if (r) for (i = 0; i < n; ++i) children[i].r += r;
          e = packEnclose(children);
          if (r) for (i = 0; i < n; ++i) children[i].r -= r;
          node.r = e + r;
        }
      };
    }

    function translateChild(k) {
      return function(node) {
        var parent = node.parent;
        node.r *= k;
        if (parent) {
          node.x = parent.x + k * node.x;
          node.y = parent.y + k * node.y;
        }
      };
    }

    function initRange(domain, range) {
      switch (arguments.length) {
        case 0: break;
        case 1: this.range(domain); break;
        default: this.range(range).domain(domain); break;
      }
      return this;
    }

    var array$1 = Array.prototype;

    var map$2 = array$1.map;
    var slice$2 = array$1.slice;

    var implicit = {name: "implicit"};

    function ordinal() {
      var index = map(),
          domain = [],
          range = [],
          unknown = implicit;

      function scale(d) {
        var key = d + "", i = index.get(key);
        if (!i) {
          if (unknown !== implicit) return unknown;
          index.set(key, i = domain.push(d));
        }
        return range[(i - 1) % range.length];
      }

      scale.domain = function(_) {
        if (!arguments.length) return domain.slice();
        domain = [], index = map();
        var i = -1, n = _.length, d, key;
        while (++i < n) if (!index.has(key = (d = _[i]) + "")) index.set(key, domain.push(d));
        return scale;
      };

      scale.range = function(_) {
        return arguments.length ? (range = slice$2.call(_), scale) : range.slice();
      };

      scale.unknown = function(_) {
        return arguments.length ? (unknown = _, scale) : unknown;
      };

      scale.copy = function() {
        return ordinal(domain, range).unknown(unknown);
      };

      initRange.apply(scale, arguments);

      return scale;
    }

    function band() {
      var scale = ordinal().unknown(undefined),
          domain = scale.domain,
          ordinalRange = scale.range,
          range = [0, 1],
          step,
          bandwidth,
          round = false,
          paddingInner = 0,
          paddingOuter = 0,
          align = 0.5;

      delete scale.unknown;

      function rescale() {
        var n = domain().length,
            reverse = range[1] < range[0],
            start = range[reverse - 0],
            stop = range[1 - reverse];
        step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
        if (round) step = Math.floor(step);
        start += (stop - start - step * (n - paddingInner)) * align;
        bandwidth = step * (1 - paddingInner);
        if (round) start = Math.round(start), bandwidth = Math.round(bandwidth);
        var values = sequence(n).map(function(i) { return start + step * i; });
        return ordinalRange(reverse ? values.reverse() : values);
      }

      scale.domain = function(_) {
        return arguments.length ? (domain(_), rescale()) : domain();
      };

      scale.range = function(_) {
        return arguments.length ? (range = [+_[0], +_[1]], rescale()) : range.slice();
      };

      scale.rangeRound = function(_) {
        return range = [+_[0], +_[1]], round = true, rescale();
      };

      scale.bandwidth = function() {
        return bandwidth;
      };

      scale.step = function() {
        return step;
      };

      scale.round = function(_) {
        return arguments.length ? (round = !!_, rescale()) : round;
      };

      scale.padding = function(_) {
        return arguments.length ? (paddingInner = Math.min(1, paddingOuter = +_), rescale()) : paddingInner;
      };

      scale.paddingInner = function(_) {
        return arguments.length ? (paddingInner = Math.min(1, _), rescale()) : paddingInner;
      };

      scale.paddingOuter = function(_) {
        return arguments.length ? (paddingOuter = +_, rescale()) : paddingOuter;
      };

      scale.align = function(_) {
        return arguments.length ? (align = Math.max(0, Math.min(1, _)), rescale()) : align;
      };

      scale.copy = function() {
        return band(domain(), range)
            .round(round)
            .paddingInner(paddingInner)
            .paddingOuter(paddingOuter)
            .align(align);
      };

      return initRange.apply(rescale(), arguments);
    }

    function constant$3(x) {
      return function() {
        return x;
      };
    }

    function number$1(x) {
      return +x;
    }

    var unit = [0, 1];

    function identity$3(x) {
      return x;
    }

    function normalize(a, b) {
      return (b -= (a = +a))
          ? function(x) { return (x - a) / b; }
          : constant$3(isNaN(b) ? NaN : 0.5);
    }

    function clamper(domain) {
      var a = domain[0], b = domain[domain.length - 1], t;
      if (a > b) t = a, a = b, b = t;
      return function(x) { return Math.max(a, Math.min(b, x)); };
    }

    // normalize(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
    // interpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding range value x in [a,b].
    function bimap(domain, range, interpolate) {
      var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
      if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
      else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
      return function(x) { return r0(d0(x)); };
    }

    function polymap(domain, range, interpolate) {
      var j = Math.min(domain.length, range.length) - 1,
          d = new Array(j),
          r = new Array(j),
          i = -1;

      // Reverse descending domains.
      if (domain[j] < domain[0]) {
        domain = domain.slice().reverse();
        range = range.slice().reverse();
      }

      while (++i < j) {
        d[i] = normalize(domain[i], domain[i + 1]);
        r[i] = interpolate(range[i], range[i + 1]);
      }

      return function(x) {
        var i = bisectRight(domain, x, 1, j) - 1;
        return r[i](d[i](x));
      };
    }

    function copy(source, target) {
      return target
          .domain(source.domain())
          .range(source.range())
          .interpolate(source.interpolate())
          .clamp(source.clamp())
          .unknown(source.unknown());
    }

    function transformer() {
      var domain = unit,
          range = unit,
          interpolate = interpolateValue,
          transform,
          untransform,
          unknown,
          clamp = identity$3,
          piecewise,
          output,
          input;

      function rescale() {
        piecewise = Math.min(domain.length, range.length) > 2 ? polymap : bimap;
        output = input = null;
        return scale;
      }

      function scale(x) {
        return isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate)))(transform(clamp(x)));
      }

      scale.invert = function(y) {
        return clamp(untransform((input || (input = piecewise(range, domain.map(transform), interpolateNumber)))(y)));
      };

      scale.domain = function(_) {
        return arguments.length ? (domain = map$2.call(_, number$1), clamp === identity$3 || (clamp = clamper(domain)), rescale()) : domain.slice();
      };

      scale.range = function(_) {
        return arguments.length ? (range = slice$2.call(_), rescale()) : range.slice();
      };

      scale.rangeRound = function(_) {
        return range = slice$2.call(_), interpolate = interpolateRound, rescale();
      };

      scale.clamp = function(_) {
        return arguments.length ? (clamp = _ ? clamper(domain) : identity$3, scale) : clamp !== identity$3;
      };

      scale.interpolate = function(_) {
        return arguments.length ? (interpolate = _, rescale()) : interpolate;
      };

      scale.unknown = function(_) {
        return arguments.length ? (unknown = _, scale) : unknown;
      };

      return function(t, u) {
        transform = t, untransform = u;
        return rescale();
      };
    }

    function continuous(transform, untransform) {
      return transformer()(transform, untransform);
    }

    function tickFormat(start, stop, count, specifier) {
      var step = tickStep(start, stop, count),
          precision;
      specifier = formatSpecifier(specifier == null ? ",f" : specifier);
      switch (specifier.type) {
        case "s": {
          var value = Math.max(Math.abs(start), Math.abs(stop));
          if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
          return formatPrefix(specifier, value);
        }
        case "":
        case "e":
        case "g":
        case "p":
        case "r": {
          if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
          break;
        }
        case "f":
        case "%": {
          if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
          break;
        }
      }
      return format(specifier);
    }

    function linearish(scale) {
      var domain = scale.domain;

      scale.ticks = function(count) {
        var d = domain();
        return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
      };

      scale.tickFormat = function(count, specifier) {
        var d = domain();
        return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
      };

      scale.nice = function(count) {
        if (count == null) count = 10;

        var d = domain(),
            i0 = 0,
            i1 = d.length - 1,
            start = d[i0],
            stop = d[i1],
            step;

        if (stop < start) {
          step = start, start = stop, stop = step;
          step = i0, i0 = i1, i1 = step;
        }

        step = tickIncrement(start, stop, count);

        if (step > 0) {
          start = Math.floor(start / step) * step;
          stop = Math.ceil(stop / step) * step;
          step = tickIncrement(start, stop, count);
        } else if (step < 0) {
          start = Math.ceil(start * step) / step;
          stop = Math.floor(stop * step) / step;
          step = tickIncrement(start, stop, count);
        }

        if (step > 0) {
          d[i0] = Math.floor(start / step) * step;
          d[i1] = Math.ceil(stop / step) * step;
          domain(d);
        } else if (step < 0) {
          d[i0] = Math.ceil(start * step) / step;
          d[i1] = Math.floor(stop * step) / step;
          domain(d);
        }

        return scale;
      };

      return scale;
    }

    function linear$1() {
      var scale = continuous(identity$3, identity$3);

      scale.copy = function() {
        return copy(scale, linear$1());
      };

      initRange.apply(scale, arguments);

      return linearish(scale);
    }

    var t0 = new Date,
        t1 = new Date;

    function newInterval(floori, offseti, count, field) {

      function interval(date) {
        return floori(date = arguments.length === 0 ? new Date : new Date(+date)), date;
      }

      interval.floor = function(date) {
        return floori(date = new Date(+date)), date;
      };

      interval.ceil = function(date) {
        return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
      };

      interval.round = function(date) {
        var d0 = interval(date),
            d1 = interval.ceil(date);
        return date - d0 < d1 - date ? d0 : d1;
      };

      interval.offset = function(date, step) {
        return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
      };

      interval.range = function(start, stop, step) {
        var range = [], previous;
        start = interval.ceil(start);
        step = step == null ? 1 : Math.floor(step);
        if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
        do range.push(previous = new Date(+start)), offseti(start, step), floori(start);
        while (previous < start && start < stop);
        return range;
      };

      interval.filter = function(test) {
        return newInterval(function(date) {
          if (date >= date) while (floori(date), !test(date)) date.setTime(date - 1);
        }, function(date, step) {
          if (date >= date) {
            if (step < 0) while (++step <= 0) {
              while (offseti(date, -1), !test(date)) {} // eslint-disable-line no-empty
            } else while (--step >= 0) {
              while (offseti(date, +1), !test(date)) {} // eslint-disable-line no-empty
            }
          }
        });
      };

      if (count) {
        interval.count = function(start, end) {
          t0.setTime(+start), t1.setTime(+end);
          floori(t0), floori(t1);
          return Math.floor(count(t0, t1));
        };

        interval.every = function(step) {
          step = Math.floor(step);
          return !isFinite(step) || !(step > 0) ? null
              : !(step > 1) ? interval
              : interval.filter(field
                  ? function(d) { return field(d) % step === 0; }
                  : function(d) { return interval.count(0, d) % step === 0; });
        };
      }

      return interval;
    }

    var durationMinute = 6e4;
    var durationDay = 864e5;
    var durationWeek = 6048e5;

    var day = newInterval(function(date) {
      date.setHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setDate(date.getDate() + step);
    }, function(start, end) {
      return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay;
    }, function(date) {
      return date.getDate() - 1;
    });

    function weekday(i) {
      return newInterval(function(date) {
        date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
        date.setHours(0, 0, 0, 0);
      }, function(date, step) {
        date.setDate(date.getDate() + step * 7);
      }, function(start, end) {
        return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
      });
    }

    var sunday = weekday(0);
    var monday = weekday(1);
    var tuesday = weekday(2);
    var wednesday = weekday(3);
    var thursday = weekday(4);
    var friday = weekday(5);
    var saturday = weekday(6);

    var year = newInterval(function(date) {
      date.setMonth(0, 1);
      date.setHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setFullYear(date.getFullYear() + step);
    }, function(start, end) {
      return end.getFullYear() - start.getFullYear();
    }, function(date) {
      return date.getFullYear();
    });

    // An optimized implementation for this simple case.
    year.every = function(k) {
      return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
        date.setFullYear(Math.floor(date.getFullYear() / k) * k);
        date.setMonth(0, 1);
        date.setHours(0, 0, 0, 0);
      }, function(date, step) {
        date.setFullYear(date.getFullYear() + step * k);
      });
    };

    var utcDay = newInterval(function(date) {
      date.setUTCHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setUTCDate(date.getUTCDate() + step);
    }, function(start, end) {
      return (end - start) / durationDay;
    }, function(date) {
      return date.getUTCDate() - 1;
    });

    function utcWeekday(i) {
      return newInterval(function(date) {
        date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
        date.setUTCHours(0, 0, 0, 0);
      }, function(date, step) {
        date.setUTCDate(date.getUTCDate() + step * 7);
      }, function(start, end) {
        return (end - start) / durationWeek;
      });
    }

    var utcSunday = utcWeekday(0);
    var utcMonday = utcWeekday(1);
    var utcTuesday = utcWeekday(2);
    var utcWednesday = utcWeekday(3);
    var utcThursday = utcWeekday(4);
    var utcFriday = utcWeekday(5);
    var utcSaturday = utcWeekday(6);

    var utcYear = newInterval(function(date) {
      date.setUTCMonth(0, 1);
      date.setUTCHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setUTCFullYear(date.getUTCFullYear() + step);
    }, function(start, end) {
      return end.getUTCFullYear() - start.getUTCFullYear();
    }, function(date) {
      return date.getUTCFullYear();
    });

    // An optimized implementation for this simple case.
    utcYear.every = function(k) {
      return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
        date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
        date.setUTCMonth(0, 1);
        date.setUTCHours(0, 0, 0, 0);
      }, function(date, step) {
        date.setUTCFullYear(date.getUTCFullYear() + step * k);
      });
    };

    function localDate(d) {
      if (0 <= d.y && d.y < 100) {
        var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
        date.setFullYear(d.y);
        return date;
      }
      return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
    }

    function utcDate(d) {
      if (0 <= d.y && d.y < 100) {
        var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
        date.setUTCFullYear(d.y);
        return date;
      }
      return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
    }

    function newYear(y) {
      return {y: y, m: 0, d: 1, H: 0, M: 0, S: 0, L: 0};
    }

    function formatLocale$1(locale) {
      var locale_dateTime = locale.dateTime,
          locale_date = locale.date,
          locale_time = locale.time,
          locale_periods = locale.periods,
          locale_weekdays = locale.days,
          locale_shortWeekdays = locale.shortDays,
          locale_months = locale.months,
          locale_shortMonths = locale.shortMonths;

      var periodRe = formatRe(locale_periods),
          periodLookup = formatLookup(locale_periods),
          weekdayRe = formatRe(locale_weekdays),
          weekdayLookup = formatLookup(locale_weekdays),
          shortWeekdayRe = formatRe(locale_shortWeekdays),
          shortWeekdayLookup = formatLookup(locale_shortWeekdays),
          monthRe = formatRe(locale_months),
          monthLookup = formatLookup(locale_months),
          shortMonthRe = formatRe(locale_shortMonths),
          shortMonthLookup = formatLookup(locale_shortMonths);

      var formats = {
        "a": formatShortWeekday,
        "A": formatWeekday,
        "b": formatShortMonth,
        "B": formatMonth,
        "c": null,
        "d": formatDayOfMonth,
        "e": formatDayOfMonth,
        "f": formatMicroseconds,
        "H": formatHour24,
        "I": formatHour12,
        "j": formatDayOfYear,
        "L": formatMilliseconds,
        "m": formatMonthNumber,
        "M": formatMinutes,
        "p": formatPeriod,
        "Q": formatUnixTimestamp,
        "s": formatUnixTimestampSeconds,
        "S": formatSeconds,
        "u": formatWeekdayNumberMonday,
        "U": formatWeekNumberSunday,
        "V": formatWeekNumberISO,
        "w": formatWeekdayNumberSunday,
        "W": formatWeekNumberMonday,
        "x": null,
        "X": null,
        "y": formatYear$1,
        "Y": formatFullYear,
        "Z": formatZone,
        "%": formatLiteralPercent
      };

      var utcFormats = {
        "a": formatUTCShortWeekday,
        "A": formatUTCWeekday,
        "b": formatUTCShortMonth,
        "B": formatUTCMonth,
        "c": null,
        "d": formatUTCDayOfMonth,
        "e": formatUTCDayOfMonth,
        "f": formatUTCMicroseconds,
        "H": formatUTCHour24,
        "I": formatUTCHour12,
        "j": formatUTCDayOfYear,
        "L": formatUTCMilliseconds,
        "m": formatUTCMonthNumber,
        "M": formatUTCMinutes,
        "p": formatUTCPeriod,
        "Q": formatUnixTimestamp,
        "s": formatUnixTimestampSeconds,
        "S": formatUTCSeconds,
        "u": formatUTCWeekdayNumberMonday,
        "U": formatUTCWeekNumberSunday,
        "V": formatUTCWeekNumberISO,
        "w": formatUTCWeekdayNumberSunday,
        "W": formatUTCWeekNumberMonday,
        "x": null,
        "X": null,
        "y": formatUTCYear,
        "Y": formatUTCFullYear,
        "Z": formatUTCZone,
        "%": formatLiteralPercent
      };

      var parses = {
        "a": parseShortWeekday,
        "A": parseWeekday,
        "b": parseShortMonth,
        "B": parseMonth,
        "c": parseLocaleDateTime,
        "d": parseDayOfMonth,
        "e": parseDayOfMonth,
        "f": parseMicroseconds,
        "H": parseHour24,
        "I": parseHour24,
        "j": parseDayOfYear,
        "L": parseMilliseconds,
        "m": parseMonthNumber,
        "M": parseMinutes,
        "p": parsePeriod,
        "Q": parseUnixTimestamp,
        "s": parseUnixTimestampSeconds,
        "S": parseSeconds,
        "u": parseWeekdayNumberMonday,
        "U": parseWeekNumberSunday,
        "V": parseWeekNumberISO,
        "w": parseWeekdayNumberSunday,
        "W": parseWeekNumberMonday,
        "x": parseLocaleDate,
        "X": parseLocaleTime,
        "y": parseYear,
        "Y": parseFullYear,
        "Z": parseZone,
        "%": parseLiteralPercent
      };

      // These recursive directive definitions must be deferred.
      formats.x = newFormat(locale_date, formats);
      formats.X = newFormat(locale_time, formats);
      formats.c = newFormat(locale_dateTime, formats);
      utcFormats.x = newFormat(locale_date, utcFormats);
      utcFormats.X = newFormat(locale_time, utcFormats);
      utcFormats.c = newFormat(locale_dateTime, utcFormats);

      function newFormat(specifier, formats) {
        return function(date) {
          var string = [],
              i = -1,
              j = 0,
              n = specifier.length,
              c,
              pad,
              format;

          if (!(date instanceof Date)) date = new Date(+date);

          while (++i < n) {
            if (specifier.charCodeAt(i) === 37) {
              string.push(specifier.slice(j, i));
              if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
              else pad = c === "e" ? " " : "0";
              if (format = formats[c]) c = format(date, pad);
              string.push(c);
              j = i + 1;
            }
          }

          string.push(specifier.slice(j, i));
          return string.join("");
        };
      }

      function newParse(specifier, newDate) {
        return function(string) {
          var d = newYear(1900),
              i = parseSpecifier(d, specifier, string += "", 0),
              week, day$1;
          if (i != string.length) return null;

          // If a UNIX timestamp is specified, return it.
          if ("Q" in d) return new Date(d.Q);

          // The am-pm flag is 0 for AM, and 1 for PM.
          if ("p" in d) d.H = d.H % 12 + d.p * 12;

          // Convert day-of-week and week-of-year to day-of-year.
          if ("V" in d) {
            if (d.V < 1 || d.V > 53) return null;
            if (!("w" in d)) d.w = 1;
            if ("Z" in d) {
              week = utcDate(newYear(d.y)), day$1 = week.getUTCDay();
              week = day$1 > 4 || day$1 === 0 ? utcMonday.ceil(week) : utcMonday(week);
              week = utcDay.offset(week, (d.V - 1) * 7);
              d.y = week.getUTCFullYear();
              d.m = week.getUTCMonth();
              d.d = week.getUTCDate() + (d.w + 6) % 7;
            } else {
              week = newDate(newYear(d.y)), day$1 = week.getDay();
              week = day$1 > 4 || day$1 === 0 ? monday.ceil(week) : monday(week);
              week = day.offset(week, (d.V - 1) * 7);
              d.y = week.getFullYear();
              d.m = week.getMonth();
              d.d = week.getDate() + (d.w + 6) % 7;
            }
          } else if ("W" in d || "U" in d) {
            if (!("w" in d)) d.w = "u" in d ? d.u % 7 : "W" in d ? 1 : 0;
            day$1 = "Z" in d ? utcDate(newYear(d.y)).getUTCDay() : newDate(newYear(d.y)).getDay();
            d.m = 0;
            d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day$1 + 5) % 7 : d.w + d.U * 7 - (day$1 + 6) % 7;
          }

          // If a time zone is specified, all fields are interpreted as UTC and then
          // offset according to the specified time zone.
          if ("Z" in d) {
            d.H += d.Z / 100 | 0;
            d.M += d.Z % 100;
            return utcDate(d);
          }

          // Otherwise, all fields are in local time.
          return newDate(d);
        };
      }

      function parseSpecifier(d, specifier, string, j) {
        var i = 0,
            n = specifier.length,
            m = string.length,
            c,
            parse;

        while (i < n) {
          if (j >= m) return -1;
          c = specifier.charCodeAt(i++);
          if (c === 37) {
            c = specifier.charAt(i++);
            parse = parses[c in pads ? specifier.charAt(i++) : c];
            if (!parse || ((j = parse(d, string, j)) < 0)) return -1;
          } else if (c != string.charCodeAt(j++)) {
            return -1;
          }
        }

        return j;
      }

      function parsePeriod(d, string, i) {
        var n = periodRe.exec(string.slice(i));
        return n ? (d.p = periodLookup[n[0].toLowerCase()], i + n[0].length) : -1;
      }

      function parseShortWeekday(d, string, i) {
        var n = shortWeekdayRe.exec(string.slice(i));
        return n ? (d.w = shortWeekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
      }

      function parseWeekday(d, string, i) {
        var n = weekdayRe.exec(string.slice(i));
        return n ? (d.w = weekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
      }

      function parseShortMonth(d, string, i) {
        var n = shortMonthRe.exec(string.slice(i));
        return n ? (d.m = shortMonthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
      }

      function parseMonth(d, string, i) {
        var n = monthRe.exec(string.slice(i));
        return n ? (d.m = monthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
      }

      function parseLocaleDateTime(d, string, i) {
        return parseSpecifier(d, locale_dateTime, string, i);
      }

      function parseLocaleDate(d, string, i) {
        return parseSpecifier(d, locale_date, string, i);
      }

      function parseLocaleTime(d, string, i) {
        return parseSpecifier(d, locale_time, string, i);
      }

      function formatShortWeekday(d) {
        return locale_shortWeekdays[d.getDay()];
      }

      function formatWeekday(d) {
        return locale_weekdays[d.getDay()];
      }

      function formatShortMonth(d) {
        return locale_shortMonths[d.getMonth()];
      }

      function formatMonth(d) {
        return locale_months[d.getMonth()];
      }

      function formatPeriod(d) {
        return locale_periods[+(d.getHours() >= 12)];
      }

      function formatUTCShortWeekday(d) {
        return locale_shortWeekdays[d.getUTCDay()];
      }

      function formatUTCWeekday(d) {
        return locale_weekdays[d.getUTCDay()];
      }

      function formatUTCShortMonth(d) {
        return locale_shortMonths[d.getUTCMonth()];
      }

      function formatUTCMonth(d) {
        return locale_months[d.getUTCMonth()];
      }

      function formatUTCPeriod(d) {
        return locale_periods[+(d.getUTCHours() >= 12)];
      }

      return {
        format: function(specifier) {
          var f = newFormat(specifier += "", formats);
          f.toString = function() { return specifier; };
          return f;
        },
        parse: function(specifier) {
          var p = newParse(specifier += "", localDate);
          p.toString = function() { return specifier; };
          return p;
        },
        utcFormat: function(specifier) {
          var f = newFormat(specifier += "", utcFormats);
          f.toString = function() { return specifier; };
          return f;
        },
        utcParse: function(specifier) {
          var p = newParse(specifier, utcDate);
          p.toString = function() { return specifier; };
          return p;
        }
      };
    }

    var pads = {"-": "", "_": " ", "0": "0"},
        numberRe = /^\s*\d+/, // note: ignores next directive
        percentRe = /^%/,
        requoteRe = /[\\^$*+?|[\]().{}]/g;

    function pad$1(value, fill, width) {
      var sign = value < 0 ? "-" : "",
          string = (sign ? -value : value) + "",
          length = string.length;
      return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
    }

    function requote(s) {
      return s.replace(requoteRe, "\\$&");
    }

    function formatRe(names) {
      return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
    }

    function formatLookup(names) {
      var map = {}, i = -1, n = names.length;
      while (++i < n) map[names[i].toLowerCase()] = i;
      return map;
    }

    function parseWeekdayNumberSunday(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 1));
      return n ? (d.w = +n[0], i + n[0].length) : -1;
    }

    function parseWeekdayNumberMonday(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 1));
      return n ? (d.u = +n[0], i + n[0].length) : -1;
    }

    function parseWeekNumberSunday(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.U = +n[0], i + n[0].length) : -1;
    }

    function parseWeekNumberISO(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.V = +n[0], i + n[0].length) : -1;
    }

    function parseWeekNumberMonday(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.W = +n[0], i + n[0].length) : -1;
    }

    function parseFullYear(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 4));
      return n ? (d.y = +n[0], i + n[0].length) : -1;
    }

    function parseYear(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
    }

    function parseZone(d, string, i) {
      var n = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(string.slice(i, i + 6));
      return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
    }

    function parseMonthNumber(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
    }

    function parseDayOfMonth(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.d = +n[0], i + n[0].length) : -1;
    }

    function parseDayOfYear(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 3));
      return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
    }

    function parseHour24(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.H = +n[0], i + n[0].length) : -1;
    }

    function parseMinutes(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.M = +n[0], i + n[0].length) : -1;
    }

    function parseSeconds(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.S = +n[0], i + n[0].length) : -1;
    }

    function parseMilliseconds(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 3));
      return n ? (d.L = +n[0], i + n[0].length) : -1;
    }

    function parseMicroseconds(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 6));
      return n ? (d.L = Math.floor(n[0] / 1000), i + n[0].length) : -1;
    }

    function parseLiteralPercent(d, string, i) {
      var n = percentRe.exec(string.slice(i, i + 1));
      return n ? i + n[0].length : -1;
    }

    function parseUnixTimestamp(d, string, i) {
      var n = numberRe.exec(string.slice(i));
      return n ? (d.Q = +n[0], i + n[0].length) : -1;
    }

    function parseUnixTimestampSeconds(d, string, i) {
      var n = numberRe.exec(string.slice(i));
      return n ? (d.Q = (+n[0]) * 1000, i + n[0].length) : -1;
    }

    function formatDayOfMonth(d, p) {
      return pad$1(d.getDate(), p, 2);
    }

    function formatHour24(d, p) {
      return pad$1(d.getHours(), p, 2);
    }

    function formatHour12(d, p) {
      return pad$1(d.getHours() % 12 || 12, p, 2);
    }

    function formatDayOfYear(d, p) {
      return pad$1(1 + day.count(year(d), d), p, 3);
    }

    function formatMilliseconds(d, p) {
      return pad$1(d.getMilliseconds(), p, 3);
    }

    function formatMicroseconds(d, p) {
      return formatMilliseconds(d, p) + "000";
    }

    function formatMonthNumber(d, p) {
      return pad$1(d.getMonth() + 1, p, 2);
    }

    function formatMinutes(d, p) {
      return pad$1(d.getMinutes(), p, 2);
    }

    function formatSeconds(d, p) {
      return pad$1(d.getSeconds(), p, 2);
    }

    function formatWeekdayNumberMonday(d) {
      var day = d.getDay();
      return day === 0 ? 7 : day;
    }

    function formatWeekNumberSunday(d, p) {
      return pad$1(sunday.count(year(d), d), p, 2);
    }

    function formatWeekNumberISO(d, p) {
      var day = d.getDay();
      d = (day >= 4 || day === 0) ? thursday(d) : thursday.ceil(d);
      return pad$1(thursday.count(year(d), d) + (year(d).getDay() === 4), p, 2);
    }

    function formatWeekdayNumberSunday(d) {
      return d.getDay();
    }

    function formatWeekNumberMonday(d, p) {
      return pad$1(monday.count(year(d), d), p, 2);
    }

    function formatYear$1(d, p) {
      return pad$1(d.getFullYear() % 100, p, 2);
    }

    function formatFullYear(d, p) {
      return pad$1(d.getFullYear() % 10000, p, 4);
    }

    function formatZone(d) {
      var z = d.getTimezoneOffset();
      return (z > 0 ? "-" : (z *= -1, "+"))
          + pad$1(z / 60 | 0, "0", 2)
          + pad$1(z % 60, "0", 2);
    }

    function formatUTCDayOfMonth(d, p) {
      return pad$1(d.getUTCDate(), p, 2);
    }

    function formatUTCHour24(d, p) {
      return pad$1(d.getUTCHours(), p, 2);
    }

    function formatUTCHour12(d, p) {
      return pad$1(d.getUTCHours() % 12 || 12, p, 2);
    }

    function formatUTCDayOfYear(d, p) {
      return pad$1(1 + utcDay.count(utcYear(d), d), p, 3);
    }

    function formatUTCMilliseconds(d, p) {
      return pad$1(d.getUTCMilliseconds(), p, 3);
    }

    function formatUTCMicroseconds(d, p) {
      return formatUTCMilliseconds(d, p) + "000";
    }

    function formatUTCMonthNumber(d, p) {
      return pad$1(d.getUTCMonth() + 1, p, 2);
    }

    function formatUTCMinutes(d, p) {
      return pad$1(d.getUTCMinutes(), p, 2);
    }

    function formatUTCSeconds(d, p) {
      return pad$1(d.getUTCSeconds(), p, 2);
    }

    function formatUTCWeekdayNumberMonday(d) {
      var dow = d.getUTCDay();
      return dow === 0 ? 7 : dow;
    }

    function formatUTCWeekNumberSunday(d, p) {
      return pad$1(utcSunday.count(utcYear(d), d), p, 2);
    }

    function formatUTCWeekNumberISO(d, p) {
      var day = d.getUTCDay();
      d = (day >= 4 || day === 0) ? utcThursday(d) : utcThursday.ceil(d);
      return pad$1(utcThursday.count(utcYear(d), d) + (utcYear(d).getUTCDay() === 4), p, 2);
    }

    function formatUTCWeekdayNumberSunday(d) {
      return d.getUTCDay();
    }

    function formatUTCWeekNumberMonday(d, p) {
      return pad$1(utcMonday.count(utcYear(d), d), p, 2);
    }

    function formatUTCYear(d, p) {
      return pad$1(d.getUTCFullYear() % 100, p, 2);
    }

    function formatUTCFullYear(d, p) {
      return pad$1(d.getUTCFullYear() % 10000, p, 4);
    }

    function formatUTCZone() {
      return "+0000";
    }

    function formatLiteralPercent() {
      return "%";
    }

    function formatUnixTimestamp(d) {
      return +d;
    }

    function formatUnixTimestampSeconds(d) {
      return Math.floor(+d / 1000);
    }

    var locale$1;
    var timeFormat;
    var timeParse;
    var utcFormat;
    var utcParse;

    defaultLocale$1({
      dateTime: "%x, %X",
      date: "%-m/%-d/%Y",
      time: "%-I:%M:%S %p",
      periods: ["AM", "PM"],
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    });

    function defaultLocale$1(definition) {
      locale$1 = formatLocale$1(definition);
      timeFormat = locale$1.format;
      timeParse = locale$1.parse;
      utcFormat = locale$1.utcFormat;
      utcParse = locale$1.utcParse;
      return locale$1;
    }

    var isoSpecifier = "%Y-%m-%dT%H:%M:%S.%LZ";

    function formatIsoNative(date) {
      return date.toISOString();
    }

    var formatIso = Date.prototype.toISOString
        ? formatIsoNative
        : utcFormat(isoSpecifier);

    function parseIsoNative(string) {
      var date = new Date(string);
      return isNaN(date) ? null : date;
    }

    var parseIso = +new Date("2000-01-01T00:00:00.000Z")
        ? parseIsoNative
        : utcParse(isoSpecifier);

    function colors(specifier) {
      var n = specifier.length / 6 | 0, colors = new Array(n), i = 0;
      while (i < n) colors[i] = "#" + specifier.slice(i * 6, ++i * 6);
      return colors;
    }

    var category10 = colors("1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf");

    function sign(x) {
      return x < 0 ? -1 : 1;
    }

    // Calculate the slopes of the tangents (Hermite-type interpolation) based on
    // the following paper: Steffen, M. 1990. A Simple Method for Monotonic
    // Interpolation in One Dimension. Astronomy and Astrophysics, Vol. 239, NO.
    // NOV(II), P. 443, 1990.
    function slope3(that, x2, y2) {
      var h0 = that._x1 - that._x0,
          h1 = x2 - that._x1,
          s0 = (that._y1 - that._y0) / (h0 || h1 < 0 && -0),
          s1 = (y2 - that._y1) / (h1 || h0 < 0 && -0),
          p = (s0 * h1 + s1 * h0) / (h0 + h1);
      return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
    }

    // Calculate a one-sided slope.
    function slope2(that, t) {
      var h = that._x1 - that._x0;
      return h ? (3 * (that._y1 - that._y0) / h - t) / 2 : t;
    }

    // According to https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Representations
    // "you can express cubic Hermite interpolation in terms of cubic Bézier curves
    // with respect to the four values p0, p0 + m0 / 3, p1 - m1 / 3, p1".
    function point(that, t0, t1) {
      var x0 = that._x0,
          y0 = that._y0,
          x1 = that._x1,
          y1 = that._y1,
          dx = (x1 - x0) / 3;
      that._context.bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
    }

    function MonotoneX(context) {
      this._context = context;
    }

    MonotoneX.prototype = {
      areaStart: function() {
        this._line = 0;
      },
      areaEnd: function() {
        this._line = NaN;
      },
      lineStart: function() {
        this._x0 = this._x1 =
        this._y0 = this._y1 =
        this._t0 = NaN;
        this._point = 0;
      },
      lineEnd: function() {
        switch (this._point) {
          case 2: this._context.lineTo(this._x1, this._y1); break;
          case 3: point(this, this._t0, slope2(this, this._t0)); break;
        }
        if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
        this._line = 1 - this._line;
      },
      point: function(x, y) {
        var t1 = NaN;

        x = +x, y = +y;
        if (x === this._x1 && y === this._y1) return; // Ignore coincident points.
        switch (this._point) {
          case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
          case 1: this._point = 2; break;
          case 2: this._point = 3; point(this, slope2(this, t1 = slope3(this, x, y)), t1); break;
          default: point(this, this._t0, t1 = slope3(this, x, y)); break;
        }

        this._x0 = this._x1, this._x1 = x;
        this._y0 = this._y1, this._y1 = y;
        this._t0 = t1;
      }
    };

    function MonotoneY(context) {
      this._context = new ReflectContext(context);
    }

    (MonotoneY.prototype = Object.create(MonotoneX.prototype)).point = function(x, y) {
      MonotoneX.prototype.point.call(this, y, x);
    };

    function ReflectContext(context) {
      this._context = context;
    }

    ReflectContext.prototype = {
      moveTo: function(x, y) { this._context.moveTo(y, x); },
      closePath: function() { this._context.closePath(); },
      lineTo: function(x, y) { this._context.lineTo(y, x); },
      bezierCurveTo: function(x1, y1, x2, y2, x, y) { this._context.bezierCurveTo(y1, x1, y2, x2, y, x); }
    };

    /* src/common/HorizontalBarChart.svelte generated by Svelte v3.12.1 */
    const { Object: Object_1 } = globals;

    const file$3 = "src/common/HorizontalBarChart.svelte";

    function create_fragment$5(ctx) {
    	var svg;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			add_location(svg, file$3, 102, 0, 2636);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			ctx.svg_binding(svg);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(svg);
    			}

    			ctx.svg_binding(null);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$5.name, type: "component", source: "", ctx });
    	return block;
    }

    function parseChartData(object) {
      return Object.entries(object)
        .map(([key, value]) => ({ name: key, value }))
        .slice(0, 10);
    }

    function instance$5($$self, $$props, $$invalidate) {
    	

      let { width, height } = $$props;

      function updateChart(data) {
        const margin = { top: 30, right: 30, bottom: 10, left: 150 };

        const yAxis = g => g.attr('transform', `translate(${margin.left},0)`).call(axisLeft(y).tickSizeOuter(0));

        const xAxis = g =>
          g
            .attr('transform', `translate(0,${margin.top})`)
            .call(axisTop(x).ticks(width / 80))
            .call(g => g.select('.domain').remove());

        const y = band()
          .domain(data.map(d => d.name))
          .range([margin.top, height - margin.bottom])
          .padding(0.1);

        const x = linear$1()
          .domain([0, max(data, d => d.value)])
          .range([margin.left, width - margin.right]);

        const format = x.tickFormat(20);

        const svg = select(svgEl)
          .style('width', width + 'px')
          .style('height', height + 'px');

        svg
          .append('g')
          .attr('fill', 'steelblue')
          .selectAll('rect')
          .data(data)
          .join('rect')
          .attr('x', x(0))
          .attr('y', d => y(d.name))
          .attr('width', d => x(d.value) - x(0))
          .attr('height', y.bandwidth())
          .attr('opacity', (d, i, array) => 1 - 0.04 * i);

        svg
          .append('g')
          .attr('fill', 'white')
          .attr('text-anchor', 'end')
          .style('font', '12px sans-serif')
          .selectAll('text')
          .data(data)
          .join('text')
          .attr('x', d => x(d.value) - 4)
          .attr('y', d => y(d.name) + y.bandwidth() / 2)
          .attr('dy', '0.35em')
          .text(d => format(d.value));

        svg.append('g').call(xAxis);

        svg.append('g').call(yAxis);

        return svg.node();
      }

      afterUpdate(() => {
        if (width && height) {
          const data = parseChartData(hb2000);

          updateChart(data);
        }
      });

      let svgEl;

    	const writable_props = ['width', 'height'];
    	Object_1.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<HorizontalBarChart> was created with unknown prop '${key}'`);
    	});

    	function svg_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('svgEl', svgEl = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ('width' in $$props) $$invalidate('width', width = $$props.width);
    		if ('height' in $$props) $$invalidate('height', height = $$props.height);
    	};

    	$$self.$capture_state = () => {
    		return { width, height, svgEl };
    	};

    	$$self.$inject_state = $$props => {
    		if ('width' in $$props) $$invalidate('width', width = $$props.width);
    		if ('height' in $$props) $$invalidate('height', height = $$props.height);
    		if ('svgEl' in $$props) $$invalidate('svgEl', svgEl = $$props.svgEl);
    	};

    	return { width, height, svgEl, svg_binding };
    }

    class HorizontalBarChart extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, ["width", "height"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "HorizontalBarChart", options, id: create_fragment$5.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.width === undefined && !('width' in props)) {
    			console.warn("<HorizontalBarChart> was created without expected prop 'width'");
    		}
    		if (ctx.height === undefined && !('height' in props)) {
    			console.warn("<HorizontalBarChart> was created without expected prop 'height'");
    		}
    	}

    	get width() {
    		throw new Error("<HorizontalBarChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<HorizontalBarChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<HorizontalBarChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<HorizontalBarChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /**
     * Convert array of 16 byte values to UUID string format of the form:
     * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
     */
    var byteToHex = [];
    for (var i = 0; i < 256; ++i) {
      byteToHex[i] = (i + 0x100).toString(16).substr(1);
    }

    function bytesToUuid(buf, offset) {
      var i = offset || 0;
      var bth = byteToHex;
      // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
      return ([bth[buf[i++]], bth[buf[i++]], 
    	bth[buf[i++]], bth[buf[i++]], '-',
    	bth[buf[i++]], bth[buf[i++]], '-',
    	bth[buf[i++]], bth[buf[i++]], '-',
    	bth[buf[i++]], bth[buf[i++]], '-',
    	bth[buf[i++]], bth[buf[i++]],
    	bth[buf[i++]], bth[buf[i++]],
    	bth[buf[i++]], bth[buf[i++]]]).join('');
    }

    var bytesToUuid_1 = bytesToUuid;

    function uuidToBytes(uuid) {
      // Note: We assume we're being passed a valid uuid string
      var bytes = [];
      uuid.replace(/[a-fA-F0-9]{2}/g, function(hex) {
        bytes.push(parseInt(hex, 16));
      });

      return bytes;
    }

    function stringToBytes(str) {
      str = unescape(encodeURIComponent(str)); // UTF8 escape
      var bytes = new Array(str.length);
      for (var i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i);
      }
      return bytes;
    }

    var v35 = function(name, version, hashfunc) {
      var generateUUID = function(value, namespace, buf, offset) {
        var off = buf && offset || 0;

        if (typeof(value) == 'string') value = stringToBytes(value);
        if (typeof(namespace) == 'string') namespace = uuidToBytes(namespace);

        if (!Array.isArray(value)) throw TypeError('value must be an array of bytes');
        if (!Array.isArray(namespace) || namespace.length !== 16) throw TypeError('namespace must be uuid string or an Array of 16 byte values');

        // Per 4.3
        var bytes = hashfunc(namespace.concat(value));
        bytes[6] = (bytes[6] & 0x0f) | version;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        if (buf) {
          for (var idx = 0; idx < 16; ++idx) {
            buf[off+idx] = bytes[idx];
          }
        }

        return buf || bytesToUuid_1(bytes);
      };

      // Function#name is not settable on some platforms (#270)
      try {
        generateUUID.name = name;
      } catch (err) {
      }

      // Pre-defined namespaces, per Appendix C
      generateUUID.DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      generateUUID.URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

      return generateUUID;
    };

    // Adapted from Chris Veness' SHA1 code at

    function f(s, x, y, z) {
      switch (s) {
        case 0: return (x & y) ^ (~x & z);
        case 1: return x ^ y ^ z;
        case 2: return (x & y) ^ (x & z) ^ (y & z);
        case 3: return x ^ y ^ z;
      }
    }

    function ROTL(x, n) {
      return (x << n) | (x>>> (32 - n));
    }

    function sha1(bytes) {
      var K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
      var H = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];

      if (typeof(bytes) == 'string') {
        var msg = unescape(encodeURIComponent(bytes)); // UTF8 escape
        bytes = new Array(msg.length);
        for (var i = 0; i < msg.length; i++) bytes[i] = msg.charCodeAt(i);
      }

      bytes.push(0x80);

      var l = bytes.length/4 + 2;
      var N = Math.ceil(l/16);
      var M = new Array(N);

      for (var i=0; i<N; i++) {
        M[i] = new Array(16);
        for (var j=0; j<16; j++) {
          M[i][j] =
            bytes[i * 64 + j * 4] << 24 |
            bytes[i * 64 + j * 4 + 1] << 16 |
            bytes[i * 64 + j * 4 + 2] << 8 |
            bytes[i * 64 + j * 4 + 3];
        }
      }

      M[N - 1][14] = ((bytes.length - 1) * 8) /
        Math.pow(2, 32); M[N - 1][14] = Math.floor(M[N - 1][14]);
      M[N - 1][15] = ((bytes.length - 1) * 8) & 0xffffffff;

      for (var i=0; i<N; i++) {
        var W = new Array(80);

        for (var t=0; t<16; t++) W[t] = M[i][t];
        for (var t=16; t<80; t++) {
          W[t] = ROTL(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
        }

        var a = H[0];
        var b = H[1];
        var c = H[2];
        var d = H[3];
        var e = H[4];

        for (var t=0; t<80; t++) {
          var s = Math.floor(t/20);
          var T = ROTL(a, 5) + f(s, b, c, d) + e + K[s] + W[t] >>> 0;
          e = d;
          d = c;
          c = ROTL(b, 30) >>> 0;
          b = a;
          a = T;
        }

        H[0] = (H[0] + a) >>> 0;
        H[1] = (H[1] + b) >>> 0;
        H[2] = (H[2] + c) >>> 0;
        H[3] = (H[3] + d) >>> 0;
        H[4] = (H[4] + e) >>> 0;
      }

      return [
        H[0] >> 24 & 0xff, H[0] >> 16 & 0xff, H[0] >> 8 & 0xff, H[0] & 0xff,
        H[1] >> 24 & 0xff, H[1] >> 16 & 0xff, H[1] >> 8 & 0xff, H[1] & 0xff,
        H[2] >> 24 & 0xff, H[2] >> 16 & 0xff, H[2] >> 8 & 0xff, H[2] & 0xff,
        H[3] >> 24 & 0xff, H[3] >> 16 & 0xff, H[3] >> 8 & 0xff, H[3] & 0xff,
        H[4] >> 24 & 0xff, H[4] >> 16 & 0xff, H[4] >> 8 & 0xff, H[4] & 0xff
      ];
    }

    var sha1Browser = sha1;

    var v5 = v35('v5', 0x50, sha1Browser);

    /* src/common/BubbleChart.svelte generated by Svelte v3.12.1 */
    const { Object: Object_1$1 } = globals;

    const file$4 = "src/common/BubbleChart.svelte";

    function create_fragment$6(ctx) {
    	var svg;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			set_style(svg, "height", "360px");
    			set_style(svg, "transform", "scale(2) translateY(5%)");
    			add_location(svg, file$4, 106, 0, 2448);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			ctx.svg_binding(svg);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(svg);
    			}

    			ctx.svg_binding(null);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$6.name, type: "component", source: "", ctx });
    	return block;
    }

    function parseChartData$1(object) {
      return Object.entries(object)
        .map(([key, value]) => ({ name: key, value, title: key, group: key }))
        .slice(0, 10);
    }

    function instance$6($$self, $$props, $$invalidate) {
    	

      let { width, height } = $$props;

      function updateChart(data) {
        const color = ordinal(data.map(d => d.group), category10);
        const format$1 = format(',d');

        const pack = data =>
          index()
            .size([width - 2, height - 2])
            .padding(3)(hierarchy({ children: data }).sum(d => d.value));

        const root = pack(data);

        const svg = select(svgEl)
          .attr('viewBox', [0, 0, width, height])
          .attr('font-size', 10)
          .attr('font-family', 'sans-serif')
          .attr('text-anchor', 'middle');

        const leaf = svg
          .selectAll('g')
          .data(root.leaves())
          .join('g')
          .attr('transform', d => `translate(${d.x + 1},${d.y + 1})`);

        leaf
          .append('circle')
          .attr(
            'id',
            d =>
              (d.leafUid = v5(
                leaf
                  .data()
                  .map(n => n.data.value)
                  .sort(() => Math.random())
                  .join(''),
                v5.URL
              )).id
          )
          .attr('r', d => d.r)
          .attr('fill-opacity', 0.7)
          .attr('fill', d => color(d.data.group));

        leaf
          .append('clipPath')
          .attr(
            'id',
            d =>
              (d.clipUid = v5(
                leaf
                  .data()
                  .map(n => n.data.value)
                  .sort(() => Math.random())
                  .join(''),
                v5.URL
              )).id
          )
          .append('use')
          .attr('xlink:href', d => d.leafUid.href);

        leaf
          .append('text')
          .attr('clip-path', d => d.clipUid)
          .selectAll('tspan')
          .data(d => d.data.name.split(/(?=[A-Z][^A-Z])/g))
          .join('tspan')
          .attr('x', 0)
          .attr('y', (d, i, nodes) => `${i - nodes.length / 2 + 0.8}em`)
          .text(d => d);

        leaf.append('title').text(d => `${d.data.title}\n${format$1(d.value)}`);

        return svg.node();
      }

      afterUpdate(() => {
        if (width && height) {
          const data = parseChartData$1(hb2000);

          updateChart(data);
        }
      });

      let svgEl;

    	const writable_props = ['width', 'height'];
    	Object_1$1.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<BubbleChart> was created with unknown prop '${key}'`);
    	});

    	function svg_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('svgEl', svgEl = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ('width' in $$props) $$invalidate('width', width = $$props.width);
    		if ('height' in $$props) $$invalidate('height', height = $$props.height);
    	};

    	$$self.$capture_state = () => {
    		return { width, height, svgEl };
    	};

    	$$self.$inject_state = $$props => {
    		if ('width' in $$props) $$invalidate('width', width = $$props.width);
    		if ('height' in $$props) $$invalidate('height', height = $$props.height);
    		if ('svgEl' in $$props) $$invalidate('svgEl', svgEl = $$props.svgEl);
    	};

    	return { width, height, svgEl, svg_binding };
    }

    class BubbleChart extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, ["width", "height"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "BubbleChart", options, id: create_fragment$6.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.width === undefined && !('width' in props)) {
    			console.warn("<BubbleChart> was created without expected prop 'width'");
    		}
    		if (ctx.height === undefined && !('height' in props)) {
    			console.warn("<BubbleChart> was created without expected prop 'height'");
    		}
    	}

    	get width() {
    		throw new Error("<BubbleChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<BubbleChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<BubbleChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<BubbleChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/routes/ChartRoute.svelte generated by Svelte v3.12.1 */

    const file$5 = "src/routes/ChartRoute.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.text = list[i].text;
    	child_ctx.color = list[i].color;
    	return child_ctx;
    }

    // (150:4) <div class="section-title" slot="name">
    function create_name_slot_2(ctx) {
    	var div, img, t, span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t = space();
    			span = element("span");
    			span.textContent = "Высшее образование";
    			attr_dev(img, "src", "./images/high_grad.png");
    			attr_dev(img, "alt", "graduation");
    			attr_dev(img, "height", "22px");
    			attr_dev(img, "width", "20px");
    			attr_dev(img, "class", "svelte-yw2vvh");
    			add_location(img, file$5, 150, 6, 4118);
    			attr_dev(span, "class", "svelte-yw2vvh");
    			add_location(span, file$5, 151, 6, 4205);
    			attr_dev(div, "class", "section-title svelte-yw2vvh");
    			attr_dev(div, "slot", "name");
    			add_location(div, file$5, 149, 4, 4072);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    			append_dev(div, span);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_name_slot_2.name, type: "slot", source: "(150:4) <div class=\"section-title\" slot=\"name\">", ctx });
    	return block;
    }

    // (154:4) <div slot="chart" class="chart">
    function create_chart_slot(ctx) {
    	var div, svg0, path0, path1, path2, path3, path4, path5, path6, path7, path8, path9, path10, path11, path12, path13, path14, path15, path16, path17, path18, t0, svg1, path19, path20, path21, path22, path23, path24, path25, path26, path27, path28, path29, path30, path31, path32, path33, path34, path35, t1, svg2, path36, path37, path38, path39, path40, path41, path42, path43, path44, path45, path46, path47, path48, path49, path50, path51, path52, path53, path54, t2, svg3, path55, path56, path57, path58, path59, path60, path61, path62, path63, path64, path65, path66, path67, path68, path69, path70, path71, path72, path73, path74, path75, path76, path77;

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			path4 = svg_element("path");
    			path5 = svg_element("path");
    			path6 = svg_element("path");
    			path7 = svg_element("path");
    			path8 = svg_element("path");
    			path9 = svg_element("path");
    			path10 = svg_element("path");
    			path11 = svg_element("path");
    			path12 = svg_element("path");
    			path13 = svg_element("path");
    			path14 = svg_element("path");
    			path15 = svg_element("path");
    			path16 = svg_element("path");
    			path17 = svg_element("path");
    			path18 = svg_element("path");
    			t0 = space();
    			svg1 = svg_element("svg");
    			path19 = svg_element("path");
    			path20 = svg_element("path");
    			path21 = svg_element("path");
    			path22 = svg_element("path");
    			path23 = svg_element("path");
    			path24 = svg_element("path");
    			path25 = svg_element("path");
    			path26 = svg_element("path");
    			path27 = svg_element("path");
    			path28 = svg_element("path");
    			path29 = svg_element("path");
    			path30 = svg_element("path");
    			path31 = svg_element("path");
    			path32 = svg_element("path");
    			path33 = svg_element("path");
    			path34 = svg_element("path");
    			path35 = svg_element("path");
    			t1 = space();
    			svg2 = svg_element("svg");
    			path36 = svg_element("path");
    			path37 = svg_element("path");
    			path38 = svg_element("path");
    			path39 = svg_element("path");
    			path40 = svg_element("path");
    			path41 = svg_element("path");
    			path42 = svg_element("path");
    			path43 = svg_element("path");
    			path44 = svg_element("path");
    			path45 = svg_element("path");
    			path46 = svg_element("path");
    			path47 = svg_element("path");
    			path48 = svg_element("path");
    			path49 = svg_element("path");
    			path50 = svg_element("path");
    			path51 = svg_element("path");
    			path52 = svg_element("path");
    			path53 = svg_element("path");
    			path54 = svg_element("path");
    			t2 = space();
    			svg3 = svg_element("svg");
    			path55 = svg_element("path");
    			path56 = svg_element("path");
    			path57 = svg_element("path");
    			path58 = svg_element("path");
    			path59 = svg_element("path");
    			path60 = svg_element("path");
    			path61 = svg_element("path");
    			path62 = svg_element("path");
    			path63 = svg_element("path");
    			path64 = svg_element("path");
    			path65 = svg_element("path");
    			path66 = svg_element("path");
    			path67 = svg_element("path");
    			path68 = svg_element("path");
    			path69 = svg_element("path");
    			path70 = svg_element("path");
    			path71 = svg_element("path");
    			path72 = svg_element("path");
    			path73 = svg_element("path");
    			path74 = svg_element("path");
    			path75 = svg_element("path");
    			path76 = svg_element("path");
    			path77 = svg_element("path");
    			attr_dev(path0, "d", "M105.201 110.973H101.627L100.824 113.2H99.6641L102.922 104.669H103.906L107.17 113.2H106.016L105.201\n          110.973ZM101.967 110.048H104.867L103.414 106.057L101.967 110.048ZM113.451\n          105.594H110.709V113.2H109.59V105.594H106.854V104.669H113.451V105.594ZM115.848\n          112.28H119.891V113.2H114.717V104.669H115.848V112.28Z");
    			attr_dev(path0, "fill", "black");
    			add_location(path0, file$5, 155, 8, 4399);
    			attr_dev(path1, "d", "M101.44 10.3672C102.534 10.2731 103.631 10.1971 104.728 10.1392L107.364 60.0696C106.815 60.0986 106.267\n          60.1366 105.72 60.1836L101.44 10.3672Z");
    			attr_dev(path1, "fill", "#3182BD");
    			add_location(path1, file$5, 161, 8, 4788);
    			attr_dev(path2, "d", "M45.1619 33.8686C48.8444 30.7324 52.7496 27.8674 56.8467 25.2964L83.4234 67.6483C81.3748 68.9338 79.4222\n          70.3662 77.581 71.9344L45.1619 33.8686Z");
    			attr_dev(path2, "fill", "#6BAED6");
    			add_location(path2, file$5, 165, 8, 4997);
    			attr_dev(path3, "d", "M72.0746 17.4707C74.3117 16.5537 76.5813 15.7182 78.879 14.9658L94.4395 62.4829C93.2907 62.8591 92.1559\n          63.2768 91.0373 63.7353L72.0746 17.4707Z");
    			attr_dev(path3, "fill", "#9ECAE1");
    			add_location(path3, file$5, 169, 8, 5208);
    			attr_dev(path4, "d", "M110 10C129.926 10 149.397 15.9526 165.916 27.0942C182.436 38.2358 195.25 54.0584 202.716 72.5325C210.181\n          91.0067 211.958 111.29 207.817 130.78C203.676 150.271 193.808 168.08 179.476 181.924L144.738 145.962C151.904\n          139.04 156.838 130.136 158.909 120.39C160.979 110.645 160.091 100.503 156.358 91.2663C152.625 82.0292 146.218\n          74.1179 137.958 68.5471C129.698 62.9763 119.963 60 110 60V10Z");
    			attr_dev(path4, "fill", "#C6DBEF");
    			add_location(path4, file$5, 173, 8, 5419);
    			attr_dev(path5, "d", "M174.7 87.3052L171.504 79.3954L173.737 78.4931C174.425 78.2151 175.095 78.1213 175.746 78.2118C176.398\n          78.3024 176.98 78.5705 177.493 79.0163C178.01 79.4605 178.417 80.0459 178.715 80.7724L178.919 81.2777C179.221\n          82.0237 179.34 82.736 179.277 83.4144C179.218 84.0914 178.981 84.6885 178.566 85.2057C178.155 85.7215 177.596\n          86.1264 176.889 86.4205L174.7 87.3052ZM172.894 79.8323L175.399 86.0308L176.496 85.5874C177.3 85.2624 177.824\n          84.7601 178.067 84.0803C178.314 83.399 178.251 82.5966 177.878 81.6731L177.691 81.2113C177.328 80.3131 176.835\n          79.7015 176.211 79.3766C175.589 79.0466 174.889 79.0346 174.111 79.3405L172.894 79.8323ZM182.705\n          83.0781L186.454 81.5633L186.798 82.4162L182.002 84.3547L178.805 76.4449L179.854 76.0212L182.705 83.0781Z");
    			attr_dev(path5, "fill", "black");
    			add_location(path5, file$5, 179, 8, 5892);
    			attr_dev(path6, "d", "M179.476 181.924C169.762 191.308 158.247 198.627 145.626 203.439C133.006 208.251 119.541 210.456 106.045\n          209.922C92.549 209.388 79.3009 206.125 67.1002 200.331C54.8995 194.536 43.999 186.33 35.0565 176.208L72.5283\n          143.104C76.9995 148.165 82.4497 152.268 88.5501 155.165C94.6505 158.063 101.275 159.694 108.023\n          159.961C114.771 160.228 121.503 159.125 127.813 156.719C134.123 154.313 139.881 150.654 144.738\n          145.962L179.476 181.924Z");
    			attr_dev(path6, "fill", "#E6550D");
    			add_location(path6, file$5, 188, 8, 6751);
    			attr_dev(path7, "d", "M106.224 186.598L106.078 190.293L109.099 190.412L109.269 186.121L110.188 186.157L109.974 191.573L101.449\n          191.235L101.661 185.878L102.586 185.915L102.419 190.148L105.159 190.256L105.305 186.562L106.224\n          186.598ZM108.862 181.877L101.927 179.163L101.976 177.933L110.375 181.432L110.336 182.428L101.686\n          185.246L101.735 184.022L108.862 181.877Z");
    			attr_dev(path7, "fill", "black");
    			add_location(path7, file$5, 195, 8, 7278);
    			attr_dev(path8, "d", "M104.728 10.1392C105.386 10.1044 106.045 10.0762 106.704 10.0544L108.352 60.0273C108.023 60.0381 107.693\n          60.0523 107.364 60.0696L104.728 10.1392Z");
    			attr_dev(path8, "fill", "#FD8D3C");
    			add_location(path8, file$5, 201, 8, 7701);
    			attr_dev(path9, "d", "M35.0565 176.208C26.261 166.252 19.5373 154.643 15.2783 142.059C11.0193 129.476 9.31029 116.17 10.2511\n          102.918C11.1918 89.6669 14.7636 76.7358 20.7576 64.8801C26.7517 53.0245 35.0479 42.482 45.1618 33.8684L77.5809\n          71.9342C72.524 76.241 68.3758 81.5122 65.3788 87.44C62.3818 93.3678 60.5959 99.8334 60.1255 106.459C59.6552\n          113.085 60.5097 119.738 62.6392 126.03C64.7687 132.321 68.1305 138.126 72.5283 143.104L35.0565 176.208Z");
    			attr_dev(path9, "fill", "#FDAE6B");
    			add_location(path9, file$5, 205, 8, 7913);
    			attr_dev(path10, "d", "M33.9271 104.03L30.3561 103.777L30.0892 107.535L28.9671 107.455L29.5712 98.9453L34.8431 99.3195L34.7775\n          100.243L30.6278 99.9484L30.4212 102.859L33.9923 103.113L33.9271 104.03ZM36.7764 107.087L40.8092\n          107.374L40.7441 108.291L35.5832 107.925L36.1874 99.415L37.3154 99.4951L36.7764 107.087Z");
    			attr_dev(path10, "fill", "black");
    			add_location(path10, file$5, 211, 8, 8425);
    			attr_dev(path11, "d", "M108.681 10.0087C109.121 10.0029 109.56 10 110 10V60C109.78 60 109.56 60.0014 109.341 60.0043L108.681\n          10.0087Z");
    			attr_dev(path11, "fill", "#FDD0A2");
    			add_location(path11, file$5, 216, 8, 8787);
    			attr_dev(path12, "d", "M56.8467 25.2962C59.4533 23.6605 62.134 22.146 64.8802 20.7576L87.4401 65.3788C86.067 66.073 84.7267\n          66.8303 83.4234 67.6481L56.8467 25.2962Z");
    			attr_dev(path12, "fill", "#31A354");
    			add_location(path12, file$5, 220, 8, 8964);
    			attr_dev(path13, "d", "M64.8802 20.7575C67.2341 19.5675 69.6341 18.471 72.0746 17.4707L91.0373 63.7353C89.8171 64.2355 88.6171\n          64.7837 87.4401 65.3787L64.8802 20.7575Z");
    			attr_dev(path13, "fill", "#74C476");
    			add_location(path13, file$5, 224, 8, 9172);
    			attr_dev(path14, "d", "M78.8789 14.9659C81.1766 14.2135 83.5008 13.5446 85.8469 12.9607L97.9234 61.4804C96.7504 61.7723 95.5883\n          62.1068 94.4394 62.483L78.8789 14.9659Z");
    			attr_dev(path14, "fill", "#A1D99B");
    			add_location(path14, file$5, 228, 8, 9383);
    			attr_dev(path15, "d", "M91.6442 11.6992C93.3725 11.3764 95.1091 11.0993 96.8521 10.8682L103.426 60.4341C102.555 60.5497 101.686\n          60.6882 100.822 60.8496L91.6442 11.6992Z");
    			attr_dev(path15, "fill", "#C7E9C0");
    			add_location(path15, file$5, 232, 8, 9594);
    			attr_dev(path16, "d", "M85.8469 12.9608C87.7664 12.483 89.6997 12.0623 91.6441 11.6992L100.822 60.8497C99.8498 61.0312 98.8832\n          61.2416 97.9235 61.4804L85.8469 12.9608Z");
    			attr_dev(path16, "fill", "#756BB1");
    			add_location(path16, file$5, 236, 8, 9806);
    			attr_dev(path17, "d", "M106.704 10.0544C107.363 10.0327 108.022 10.0175 108.681 10.0088L109.341 60.0044C109.011 60.0088 108.682\n          60.0164 108.352 60.0273L106.704 10.0544Z");
    			attr_dev(path17, "fill", "#9E9AC8");
    			add_location(path17, file$5, 240, 8, 10017);
    			attr_dev(path18, "d", "M96.8521 10.8682C98.3771 10.6659 99.9067 10.4989 101.44 10.3672L105.72 60.1836C104.953 60.2495 104.189\n          60.333 103.426 60.4342L96.8521 10.8682Z");
    			attr_dev(path18, "fill", "#BCBDDC");
    			add_location(path18, file$5, 244, 8, 10229);
    			attr_dev(svg0, "width", "220");
    			attr_dev(svg0, "height", "220");
    			attr_dev(svg0, "viewBox", "0 0 220 220");
    			attr_dev(svg0, "fill", "none");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg0, file$5, 154, 6, 4291);
    			attr_dev(path19, "d", "M97.9902 113.2V104.669H100.398C101.141 104.669 101.797 104.833 102.367 105.161C102.938 105.489 103.377\n          105.956 103.686 106.561C103.998 107.167 104.156 107.862 104.16 108.647V109.192C104.16 109.997 104.004 110.702\n          103.691 111.307C103.383 111.913 102.939 112.378 102.361 112.702C101.787 113.026 101.117 113.192 100.352\n          113.2H97.9902ZM99.1152 105.594V112.28H100.299C101.166 112.28 101.84 112.01 102.32 111.471C102.805 110.932\n          103.047 110.165 103.047 109.169V108.671C103.047 107.702 102.818 106.95 102.361 106.415C101.908 105.876 101.264\n          105.602 100.428 105.594H99.1152ZM110.57\n          109.432H106.99V113.2H105.865V104.669H111.15V105.594H106.99V108.512H110.57V109.432ZM114.338 110.51L114.502\n          111.635L114.742 110.622L116.43 104.669H117.379L119.025 110.622L119.26 111.653L119.441 110.505L120.766\n          104.669H121.896L119.828 113.2H118.803L117.045 106.983L116.91 106.333L116.775 106.983L114.953\n          113.2H113.928L111.865 104.669H112.99L114.338 110.51Z");
    			attr_dev(path19, "fill", "black");
    			add_location(path19, file$5, 251, 8, 10558);
    			attr_dev(path20, "d", "M108.401 10.0128C108.934 10.0043 109.467 10 110 10V60C109.734 60 109.467 60.0021 109.201 60.0064L108.401\n          10.0128Z");
    			attr_dev(path20, "fill", "#3182BD");
    			add_location(path20, file$5, 263, 8, 11630);
    			attr_dev(path21, "d", "M110 10C124.984 10 139.777 13.3675 153.285 19.8536C166.793 26.3397 178.671 35.7786 188.041 47.4726C197.41\n          59.1666 204.032 72.8167 207.416 87.414C210.8 102.011 210.861 117.183 207.593 131.807C204.326 146.43 197.814\n          160.133 188.538 171.902C179.262 183.67 167.46 193.204 154.005 199.797C140.549 206.391 125.783 209.877 110.799\n          209.997C95.8153 210.117 80.9959 206.867 67.4365 200.49L88.7183 155.245C95.498 158.434 102.908 160.058 110.4\n          159.998C117.892 159.939 125.274 158.196 132.002 154.899C138.73 151.602 144.631 146.835 149.269 140.951C153.907\n          135.067 157.163 128.215 158.797 120.903C160.43 113.591 160.4 106.006 158.708 98.707C157.016 91.4084 153.705\n          84.5833 149.02 78.7363C144.336 72.8893 138.397 68.1699 131.643 64.9268C124.889 61.6838 117.492 60 110 60V10Z");
    			attr_dev(path21, "fill", "#6BAED6");
    			add_location(path21, file$5, 267, 8, 11810);
    			attr_dev(path22, "d", "M180.739 126.804L177.251 126.024L175.982 128.022L174.85 127.769L179.89 120.154L180.85 120.368L182.175\n          129.406L181.049 129.154L180.739 126.804ZM177.785 125.195L180.615 125.827L180.067 121.616L177.785\n          125.195ZM188.379 128.511L184.891 127.731L183.622 129.729L182.49 129.476L187.529 121.861L188.49 122.075L189.815\n          131.113L188.688 130.861L188.379 128.511ZM185.424 126.902L188.255 127.534L187.707 123.323L185.424 126.902Z");
    			attr_dev(path22, "fill", "black");
    			add_location(path22, file$5, 276, 8, 12686);
    			attr_dev(path23, "d", "M103.609 10.2044C104.407 10.1533 105.205 10.1118 106.004 10.0798L108.002 60.0399C107.603 60.0559 107.204\n          60.0766 106.805 60.1022L103.609 10.2044Z");
    			attr_dev(path23, "fill", "#DADAEB");
    			add_location(path23, file$5, 282, 8, 13186);
    			attr_dev(path24, "d", "M68.8887 18.8416C71.318 17.746 73.7902 16.748 76.2993 15.8499L93.1497 62.925C91.8951 63.374 90.659 63.873\n          89.4444 64.4208L68.8887 18.8416Z");
    			attr_dev(path24, "fill", "#9ECAE1");
    			add_location(path24, file$5, 286, 8, 13398);
    			attr_dev(path25, "d", "M76.2993 15.8497C78.8084 14.9516 81.3524 14.1541 83.9252 13.4592L96.9626 61.7296C95.6762 62.077 94.4042\n          62.4757 93.1497 62.9248L76.2993 15.8497Z");
    			attr_dev(path25, "fill", "#C6DBEF");
    			add_location(path25, file$5, 290, 8, 13603);
    			attr_dev(path26, "d", "M97.2446 10.8168C98.3018 10.6809 99.3611 10.5618 100.422 10.4597L105.211 60.2298C104.681 60.2809 104.151\n          60.3404 103.622 60.4084L97.2446 10.8168Z");
    			attr_dev(path26, "fill", "#FD8D3C");
    			add_location(path26, file$5, 294, 8, 13814);
    			attr_dev(path27, "d", "M83.9252 13.4593C85.726 12.9729 87.5401 12.537 89.3653 12.1521L99.6827 61.076C98.7701 61.2685 97.863\n          61.4865 96.9626 61.7296L83.9252 13.4593Z");
    			attr_dev(path27, "fill", "#FDAE6B");
    			add_location(path27, file$5, 298, 8, 14026);
    			attr_dev(path28, "d", "M67.4366 200.49C52.0427 193.249 38.7505 182.2 28.8173 168.39C18.8842 154.579 12.6385 138.463 10.671\n          121.565C8.70361 104.668 11.0795 87.5474 17.5739 71.824C24.0683 56.1007 34.4666 42.2941 47.7851 31.7102L78.8925\n          70.8551C72.2333 76.1471 67.0342 83.0504 63.787 90.912C60.5397 98.7737 59.3518 107.334 60.3355 115.783C61.3193\n          124.231 64.4421 132.29 69.4087 139.195C74.3753 146.1 81.0214 151.624 88.7183 155.245L67.4366 200.49Z");
    			attr_dev(path28, "fill", "#FDD0A2");
    			add_location(path28, file$5, 302, 8, 14234);
    			attr_dev(path29, "d", "M27.8774 114.195L31.4528 120.786L33.4181 113.549L34.8673 113.381L35.8539 121.855L34.7365 121.985L34.3523\n          118.685L34.0423 115.111L32.0593 122.296L31.2037 122.396L27.6306 115.875L28.1539 119.406L28.5381\n          122.706L27.4207 122.837L26.434 114.363L27.8774 114.195ZM43.8374 116.908C43.9327 117.727 43.8849 118.448\n          43.6941 119.072C43.5028 119.692 43.1918 120.196 42.7612 120.584L44.4126 121.596L43.7322 122.389L41.7801\n          121.176C41.5089 121.279 41.2181 121.348 40.9077 121.384C40.2403 121.462 39.6296 121.368 39.0756\n          121.102C38.5212 120.832 38.0652 120.412 37.7076 119.84C37.3534 119.263 37.1259 118.576 37.0251 117.778L36.9539\n          117.167C36.859 116.352 36.9169 115.616 37.1274 114.958C37.3379 114.3 37.682 113.777 38.1596 113.387C38.6407\n          112.992 39.2149 112.756 39.8823 112.679C40.5651 112.599 41.1838 112.694 41.7383 112.964C42.2966 113.233\n          42.7516 113.662 43.1032 114.25C43.4544 114.835 43.6781 115.54 43.7743 116.367L43.8374 116.908ZM42.6562\n          116.491C42.5401 115.494 42.2508 114.749 41.7884 114.256C41.3294 113.759 40.7313 113.553 39.9941\n          113.639C39.2918 113.721 38.7683 114.055 38.4237 114.642C38.0826 115.224 37.9617 115.993 38.0612\n          116.949L38.1337 117.572C38.2467 118.542 38.5374 119.283 39.006 119.795C39.4784 120.306 40.0755 120.52 40.7972\n          120.436C41.5189 120.352 42.0471 120.025 42.3819 119.455C42.7162 118.881 42.8321 118.103 42.7294 117.12L42.6562\n          116.491Z");
    			attr_dev(path29, "fill", "black");
    			add_location(path29, file$5, 308, 8, 14742);
    			attr_dev(path30, "d", "M89.3652 12.1522C90.6689 11.8772 91.978 11.6284 93.2916 11.4058L101.646 60.7029C100.989 60.8142 100.334\n          60.9386 99.6826 61.0761L89.3652 12.1522Z");
    			attr_dev(path30, "fill", "#31A354");
    			add_location(path30, file$5, 324, 8, 16279);
    			attr_dev(path31, "d", "M106.004 10.0798C106.803 10.0478 107.602 10.0255 108.401 10.0127L109.201 60.0063C108.801 60.0127 108.401\n          60.0239 108.002 60.0398L106.004 10.0798Z");
    			attr_dev(path31, "fill", "#74C476");
    			add_location(path31, file$5, 328, 8, 16490);
    			attr_dev(path32, "d", "M93.2916 11.4058C94.6053 11.1832 95.9232 10.9868 97.2447 10.8169L103.622 60.4085C102.962 60.4935 102.303\n          60.5916 101.646 60.7029L93.2916 11.4058Z");
    			attr_dev(path32, "fill", "#A1D99B");
    			add_location(path32, file$5, 332, 8, 16702);
    			attr_dev(path33, "d", "M59.6543 23.598C62.6479 21.8536 65.7302 20.266 68.8887 18.8416L89.4444 64.4208C87.8651 65.133 86.324\n          65.9268 84.8272 66.799L59.6543 23.598Z");
    			attr_dev(path33, "fill", "#C7E9C0");
    			add_location(path33, file$5, 336, 8, 16914);
    			attr_dev(path34, "d", "M47.785 31.7101C51.5417 28.7247 55.5083 26.0137 59.6543 23.5979L84.8271 66.7989C82.7542 68.0068 80.7708\n          69.3623 78.8925 70.855L47.785 31.7101Z");
    			attr_dev(path34, "fill", "#756BB1");
    			add_location(path34, file$5, 340, 8, 17120);
    			attr_dev(path35, "d", "M100.422 10.4597C101.483 10.3576 102.546 10.2725 103.609 10.2043L106.805 60.1021C106.273 60.1362 105.742\n          60.1788 105.211 60.2298L100.422 10.4597Z");
    			attr_dev(path35, "fill", "#9E9AC8");
    			add_location(path35, file$5, 344, 8, 17329);
    			attr_dev(svg1, "width", "220");
    			attr_dev(svg1, "height", "220");
    			attr_dev(svg1, "viewBox", "0 0 220 220");
    			attr_dev(svg1, "fill", "none");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg1, file$5, 250, 6, 10450);
    			attr_dev(path36, "d", "M105.553 109.21C105.553 110.046 105.412 110.776 105.131 111.401C104.85 112.022 104.451 112.497 103.936\n          112.825C103.42 113.153 102.818 113.317 102.131 113.317C101.459 113.317 100.863 113.153 100.344 112.825C99.8242\n          112.493 99.4199 112.022 99.1309 111.413C98.8457 110.8 98.6992 110.091 98.6914 109.286V108.671C98.6914 107.85\n          98.834 107.126 99.1191 106.497C99.4043 105.868 99.8066 105.387 100.326 105.055C100.85 104.719 101.447 104.552\n          102.119 104.552C102.803 104.552 103.404 104.718 103.924 105.05C104.447 105.378 104.85 105.856 105.131\n          106.485C105.412 107.11 105.553 107.839 105.553 108.671V109.21ZM104.434 108.659C104.434 107.647 104.23 106.872\n          103.824 106.333C103.418 105.79 102.85 105.518 102.119 105.518C101.408 105.518 100.848 105.79 100.438\n          106.333C100.031 106.872 99.8223 107.622 99.8105 108.583V109.21C99.8105 110.19 100.016 110.962 100.426\n          111.524C100.84 112.083 101.408 112.362 102.131 112.362C102.857 112.362 103.42 112.098 103.818 111.571C104.217\n          111.04 104.422 110.28 104.434 109.292V108.659ZM110.369 109.749H108.365V113.2H107.234V104.669H110.059C111.02\n          104.669 111.758 104.887 112.273 105.325C112.793 105.762 113.053 106.399 113.053 107.235C113.053 107.766\n          112.908 108.229 112.619 108.624C112.334 109.018 111.936 109.313 111.424 109.509L113.428\n          113.13V113.2H112.221L110.369 109.749ZM108.365 108.829H110.094C110.652 108.829 111.096 108.684 111.424\n          108.395C111.756 108.106 111.922 107.719 111.922 107.235C111.922 106.708 111.764 106.303 111.447\n          106.022C111.135 105.741 110.682 105.598 110.088 105.594H108.365V108.829ZM114.635 113.2V104.669H117.043C117.785\n          104.669 118.441 104.833 119.012 105.161C119.582 105.489 120.021 105.956 120.33 106.561C120.643 107.167 120.801\n          107.862 120.805 108.647V109.192C120.805 109.997 120.648 110.702 120.336 111.307C120.027 111.913 119.584\n          112.378 119.006 112.702C118.432 113.026 117.762 113.192 116.996 113.2H114.635ZM115.76\n          105.594V112.28H116.943C117.811 112.28 118.484 112.01 118.965 111.471C119.449 110.932 119.691 110.165 119.691\n          109.169V108.671C119.691 107.702 119.463 106.95 119.006 106.415C118.553 105.876 117.908 105.602 117.072\n          105.594H115.76Z");
    			attr_dev(path36, "fill", "black");
    			add_location(path36, file$5, 351, 8, 17661);
    			attr_dev(path37, "d", "M106.701 209.946C84.1719 209.202 62.5551 200.868 45.3569 186.297C28.1587 171.726 16.3879 151.772 11.9539\n          129.671L60.977 119.835C63.194 130.886 69.0794 140.863 77.6785 148.149C86.2776 155.434 97.086 159.601 108.35\n          159.973L106.701 209.946Z");
    			attr_dev(path37, "fill", "#6BAED6");
    			add_location(path37, file$5, 374, 8, 20011);
    			attr_dev(path38, "d", "M60.7743 169.606L58.4638 172.333L59.6437 174.385L58.8938 175.27L54.4906 167.27L55.1269 166.518L63.7458\n          169.543L62.9996 170.424L60.7743 169.606ZM57.9772 171.475L59.8521 169.262L55.8683 167.792L57.9772\n          171.475ZM65.8347 163.633L63.5242 166.36L64.7041 168.412L63.9541 169.297L59.551 161.297L60.1873 160.546L68.8061\n          163.571L68.06 164.451L65.8347 163.633ZM63.0375 165.503L64.9124 163.29L60.9286 161.819L63.0375 165.503Z");
    			attr_dev(path38, "fill", "black");
    			add_location(path38, file$5, 379, 8, 20325);
    			attr_dev(path39, "d", "M105.382 10.1066C106.261 10.066 107.14 10.037 108.02 10.0195L109.01 60.0097C108.57 60.0184 108.13 60.033\n          107.691 60.0533L105.382 10.1066Z");
    			attr_dev(path39, "fill", "#DADAEB");
    			add_location(path39, file$5, 385, 8, 20823);
    			attr_dev(path40, "d", "M100.773 10.4266C102.307 10.2845 103.843 10.1778 105.382 10.1067L107.691 60.0533C106.922 60.0889 106.153\n          60.1422 105.387 60.2133L100.773 10.4266Z");
    			attr_dev(path40, "fill", "#636363");
    			add_location(path40, file$5, 389, 8, 21027);
    			attr_dev(path41, "d", "M79.4751 14.7728C82.4086 13.8325 85.384 13.0282 88.3918 12.3625L99.1959 61.1813C97.692 61.5141 96.2043\n          61.9163 94.7375 62.3864L79.4751 14.7728Z");
    			attr_dev(path41, "fill", "#9ECAE1");
    			add_location(path41, file$5, 393, 8, 21239);
    			attr_dev(path42, "d", "M88.3918 12.3624C90.5401 11.887 92.7034 11.4826 94.8783 11.1499L102.439 60.5749C101.352 60.7413 100.27\n          60.9435 99.1959 61.1812L88.3918 12.3624Z");
    			attr_dev(path42, "fill", "#C6DBEF");
    			add_location(path42, file$5, 397, 8, 21449);
    			attr_dev(path43, "d", "M110 10C123.966 10 137.777 12.9253 150.543 18.5874C163.309 24.2495 174.748 32.5229 184.123 42.8747C193.497\n          53.2264 200.6 65.427 204.972 78.6906C209.345 91.9541 210.891 105.986 209.51 119.884L159.755 114.942C160.445\n          107.993 159.672 100.977 157.486 94.3453C155.3 87.7135 151.749 81.6132 147.061 76.4373C142.374 71.2614 136.655\n          67.1248 130.271 64.2937C123.888 61.4626 116.983 60 110 60V10Z");
    			attr_dev(path43, "fill", "#FDD0A2");
    			add_location(path43, file$5, 401, 8, 21659);
    			attr_dev(path44, "d", "M156.783 60.441L163.523 63.7285L160.918 56.6967L161.999 55.7173L167.726 62.0409L166.892 62.7961L164.662\n          60.3335L162.333 57.6047L164.894 64.6053L164.256 65.1835L157.558 61.9521L160.036 64.5223L162.266\n          66.9849L161.432 67.74L155.706 61.4164L156.783 60.441ZM171.349 53.3763C171.902 53.9872 172.283 54.602 172.49\n          55.2207C172.694 55.8365 172.734 56.4275 172.609 56.9938L174.541 56.8572L174.448 57.898L172.155 58.0457C171.994\n          58.2866 171.797 58.5119 171.565 58.7217C171.067 59.1727 170.516 59.451 169.91 59.5565C169.302 59.6591 168.687\n          59.5816 168.064 59.324C167.441 59.0608 166.856 58.6336 166.31 58.0424L165.897 57.5864C165.346 56.9783 164.966\n          56.3455 164.755 55.6879C164.544 55.0304 164.52 54.4041 164.682 53.8093C164.845 53.2089 165.175 52.6832 165.673\n          52.2322C166.182 51.7708 166.741 51.4887 167.349 51.3861C167.96 51.2808 168.579 51.3654 169.207 51.6399C169.833\n          51.9115 170.425 52.3557 170.983 52.9724L171.349 53.3763ZM170.146 53.7232C169.472 52.9791 168.803 52.5408\n          168.141 52.4084C167.478 52.2705 166.872 52.4507 166.322 52.9489C165.798 53.4235 165.566 53.9997 165.626\n          54.6774C165.687 55.3497 166.036 56.0459 166.672 56.766L167.093 57.2308C167.748 57.9546 168.415 58.3887 169.094\n          58.5329C169.776 58.6745 170.386 58.5015 170.924 58.0138C171.463 57.5261 171.703 56.9531 171.644\n          56.2947C171.583 55.6335 171.225 54.9327 170.57 54.1923L170.146 53.7232Z");
    			attr_dev(path44, "fill", "black");
    			add_location(path44, file$5, 407, 8, 22132);
    			attr_dev(path45, "d", "M69.0051 18.7892C72.4173 17.2556 75.9128 15.9146 79.4753 14.7727L94.7377 62.3863C92.9565 62.9573 91.2087\n          63.6278 89.5026 64.3946L69.0051 18.7892Z");
    			attr_dev(path45, "fill", "#31A354");
    			add_location(path45, file$5, 422, 8, 23655);
    			attr_dev(path46, "d", "M94.8782 11.1499C96.8355 10.8504 98.8014 10.6092 100.773 10.4265L105.386 60.2132C104.401 60.3046 103.418\n          60.4252 102.439 60.5749L94.8782 11.1499Z");
    			attr_dev(path46, "fill", "#74C476");
    			add_location(path46, file$5, 426, 8, 23867);
    			attr_dev(path47, "d", "M11.9538 129.671C9.23943 116.142 9.35448 102.197 12.2917 88.7142C15.2289 75.2315 20.9247 62.5026 29.0208\n          51.3284L69.5104 80.6642C65.4624 86.2513 62.6145 92.6158 61.1458 99.3571C59.6772 106.098 59.6197 113.071\n          60.9769 119.835L11.9538 129.671Z");
    			attr_dev(path47, "fill", "#A1D99B");
    			add_location(path47, file$5, 430, 8, 24079);
    			attr_dev(path48, "d", "M35.9615 93.062C35.7836 93.8788 35.4907 94.5626 35.0829 95.1134C34.6759 95.6604 34.1855 96.0393 33.6119\n          96.2502C33.0382 96.461 32.4155 96.4933 31.7438 96.3469C31.0873 96.2039 30.5402 95.9168 30.1024 95.4856C29.6654\n          95.0506 29.3706 94.5046 29.2179 93.8477C29.0698 93.1878 29.0776 92.4639 29.2412 91.6759L29.3722\n          91.0748C29.5468 90.2733 29.8404 89.5956 30.2528 89.0418C30.6653 88.4881 31.1607 88.1042 31.739 87.8904C32.322\n          87.6736 32.9417 87.6367 33.5982 87.7797C34.2661 87.9252 34.8185 88.2155 35.2555 88.6505C35.6971 89.0825\n          35.9883 89.6357 36.1293 90.31C36.2711 90.9806 36.2534 91.7223 36.0763 92.5353L35.9615 93.062ZM34.9853\n          92.2856C35.2006 91.2971 35.1672 90.4962 34.885 89.8831C34.6037 89.2661 34.1061 88.8798 33.3924 88.7243C32.6977\n          88.573 32.0922 88.7189 31.5759 89.1622C31.0642 89.6024 30.7004 90.2907 30.4844 91.2272L30.3509 91.8397C30.1422\n          92.7977 30.1784 93.5952 30.4594 94.2321C30.7451 94.866 31.241 95.2599 31.9471 95.4137C32.657 95.5684 33.2627\n          95.4305 33.7643 95C34.2667 94.5658 34.6288 93.8671 34.8506 92.9039L34.9853 92.2856ZM44.0225 94.8181C43.8445\n          95.6349 43.5516 96.3187 43.1438 96.8695C42.7368 97.4165 42.2465 97.7954 41.6728 98.0062C41.0992 98.2171\n          40.4765 98.2494 39.8047 98.103C39.1482 97.96 38.6011 97.6729 38.1633 97.2417C37.7264 96.8067 37.4315 96.2607\n          37.2788 95.6038C37.1307 94.9439 37.1385 94.2199 37.3022 93.432L37.4331 92.8309C37.6077 92.0294 37.9013 91.3517\n          38.3138 90.7979C38.7263 90.2441 39.2217 89.8603 39.8 89.6465C40.3829 89.4297 41.0026 89.3928 41.6591\n          89.5358C42.327 89.6813 42.8795 89.9715 43.3164 90.4065C43.758 90.8386 44.0493 91.3918 44.1902 92.0661C44.332\n          92.7367 44.3143 93.4784 44.1372 94.2914L44.0225 94.8181ZM43.0462 94.0417C43.2616 93.0532 43.2281 92.2523\n          42.946 91.6391C42.6646 91.0221 42.167 90.6359 41.4533 90.4804C40.7587 90.3291 40.1532 90.475 39.6368\n          90.9182C39.1252 91.3585 38.7613 92.0468 38.5453 92.9832L38.4119 93.5958C38.2032 94.5538 38.2393 95.3513\n          38.5204 95.9882C38.806 96.6221 39.3019 97.016 40.008 97.1698C40.7179 97.3245 41.3237 97.1866 41.8252\n          96.7561C42.3276 96.3219 42.6897 95.6232 42.9115 94.66L43.0462 94.0417Z");
    			attr_dev(path48, "fill", "black");
    			add_location(path48, file$5, 435, 8, 24397);
    			attr_dev(path49, "d", "M209.51 119.884C207.002 145.14 194.984 168.497 175.893 185.22C156.802 201.944 132.067 210.783 106.701\n          209.946L108.35 159.973C121.033 160.391 133.401 155.972 142.947 147.61C152.492 139.248 158.501 127.57 159.755\n          114.942L209.51 119.884Z");
    			attr_dev(path49, "fill", "#C7E9C0");
    			add_location(path49, file$5, 457, 8, 26723);
    			attr_dev(path50, "d", "M162.769 162.147L158.405 165.969C157.797 166.497 157.135 166.739 156.418 166.698C155.704 166.659 155.04\n          166.337 154.426 165.731L154.221 165.514C153.606 164.812 153.305 164.086 153.318 163.337C153.332 162.588\n          153.668 161.919 154.327 161.332L158.699 157.502L159.433 158.339L155.087 162.146C154.623 162.553 154.373\n          162.997 154.339 163.479C154.307 163.959 154.498 164.435 154.913 164.908C155.332 165.387 155.781 165.641\n          156.258 165.67C156.737 165.701 157.209 165.514 157.673 165.107L162.023 161.296L162.769 162.147ZM162.215\n          171.083L159.86 168.395L157.656 169.258L156.892 168.386L165.456 165.215L166.104 165.955L161.838 174.032L161.077\n          173.163L162.215 171.083ZM160.78 168.041L162.692 170.222L164.736 166.5L160.78 168.041Z");
    			attr_dev(path50, "fill", "black");
    			add_location(path50, file$5, 462, 8, 27034);
    			attr_dev(path51, "d", "M57.9189 24.6328C61.4885 22.4551 65.191 20.5035 69.0049 18.7893L89.5024 64.3947C87.5955 65.2518 85.7442\n          66.2276 83.9594 67.3165L57.9189 24.6328Z");
    			attr_dev(path51, "fill", "#756BB1");
    			add_location(path51, file$5, 471, 8, 27865);
    			attr_dev(path52, "d", "M108.02 10.0196C108.68 10.0065 109.34 10 110 10V60C109.67 60 109.34 60.0033 109.01 60.0098L108.02 10.0196Z");
    			attr_dev(path52, "fill", "#9E9AC8");
    			add_location(path52, file$5, 475, 8, 28076);
    			attr_dev(path53, "d", "M29.0208 51.3284C36.7908 40.6041 46.6136 31.53 57.919 24.6328L83.9595 67.3165C78.3068 70.7651 73.3954\n          75.3021 69.5104 80.6643L29.0208 51.3284Z");
    			attr_dev(path53, "fill", "#BCBDDC");
    			add_location(path53, file$5, 478, 8, 28239);
    			attr_dev(path54, "d", "M57.2259 51.3271L61.883 50.0562L62.7497 50.9945L56.8243 52.4639L54.4872 54.6228L53.7238 53.7965L56.0609\n          51.6376L57.9945 45.8469L58.8692 46.7938L57.2259 51.3271ZM60.3161 58.7307L67.1392 55.7461L67.9741\n          56.6499L59.5605 60.1147L58.8846 59.383L63.0082 51.2743L63.8391 52.1738L60.3161 58.7307Z");
    			attr_dev(path54, "fill", "black");
    			add_location(path54, file$5, 482, 8, 28448);
    			attr_dev(svg2, "width", "220");
    			attr_dev(svg2, "height", "220");
    			attr_dev(svg2, "viewBox", "0 0 220 220");
    			attr_dev(svg2, "fill", "none");
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg2, file$5, 350, 6, 17553);
    			attr_dev(path55, "d", "M102.004 109.397C101.039 109.12 100.336 108.78 99.8945 108.378C99.457 107.971 99.2383 107.471 99.2383\n          106.878C99.2383 106.206 99.5059 105.651 100.041 105.214C100.58 104.772 101.279 104.552 102.139 104.552C102.725\n          104.552 103.246 104.665 103.703 104.891C104.164 105.118 104.52 105.43 104.77 105.829C105.023 106.227 105.15\n          106.663 105.15 107.135H104.02C104.02 106.62 103.855 106.216 103.527 105.923C103.199 105.626 102.736 105.477\n          102.139 105.477C101.584 105.477 101.15 105.6 100.838 105.846C100.529 106.089 100.375 106.427 100.375\n          106.86C100.375 107.208 100.521 107.503 100.814 107.745C101.111 107.983 101.613 108.202 102.32 108.401C103.031\n          108.6 103.586 108.821 103.984 109.063C104.387 109.302 104.684 109.581 104.875 109.901C105.07 110.221 105.168\n          110.598 105.168 111.032C105.168 111.723 104.898 112.278 104.359 112.696C103.82 113.11 103.1 113.317 102.197\n          113.317C101.611 113.317 101.064 113.206 100.557 112.983C100.049 112.757 99.6562 112.448 99.3789\n          112.057C99.1055 111.667 98.9688 111.223 98.9688 110.727H100.1C100.1 111.243 100.289 111.651 100.668\n          111.952C101.051 112.249 101.561 112.397 102.197 112.397C102.791 112.397 103.246 112.276 103.562\n          112.034C103.879 111.792 104.037 111.462 104.037 111.044C104.037 110.626 103.891 110.303 103.598\n          110.077C103.305 109.846 102.773 109.62 102.004 109.397ZM111.32\n          109.432H107.74V113.2H106.615V104.669H111.9V105.594H107.74V108.512H111.32V109.432ZM119.811 109.21C119.811\n          110.046 119.67 110.776 119.389 111.401C119.107 112.022 118.709 112.497 118.193 112.825C117.678 113.153 117.076\n          113.317 116.389 113.317C115.717 113.317 115.121 113.153 114.602 112.825C114.082 112.493 113.678 112.022\n          113.389 111.413C113.104 110.8 112.957 110.091 112.949 109.286V108.671C112.949 107.85 113.092 107.126 113.377\n          106.497C113.662 105.868 114.064 105.387 114.584 105.055C115.107 104.719 115.705 104.552 116.377\n          104.552C117.061 104.552 117.662 104.718 118.182 105.05C118.705 105.378 119.107 105.856 119.389 106.485C119.67\n          107.11 119.811 107.839 119.811 108.671V109.21ZM118.691 108.659C118.691 107.647 118.488 106.872 118.082\n          106.333C117.676 105.79 117.107 105.518 116.377 105.518C115.666 105.518 115.105 105.79 114.695 106.333C114.289\n          106.872 114.08 107.622 114.068 108.583V109.21C114.068 110.19 114.273 110.962 114.684 111.524C115.098 112.083\n          115.666 112.362 116.389 112.362C117.115 112.362 117.678 112.098 118.076 111.571C118.475 111.04 118.68 110.28\n          118.691 109.292V108.659Z");
    			attr_dev(path55, "fill", "black");
    			add_location(path55, file$5, 490, 8, 28931);
    			attr_dev(path56, "d", "M46.0692 186.895C31.7548 174.994 21.0464 159.334 15.1497 141.677L62.5748 125.838C65.5232 134.667 70.8774\n          142.497 78.0346 148.448L46.0692 186.895Z");
    			attr_dev(path56, "fill", "#6BAED6");
    			add_location(path56, file$5, 516, 8, 31614);
    			attr_dev(path57, "d", "M46.7415 154.434L43.7911 156.452L44.3852 158.743L43.4276 159.398L41.3014 150.517L42.114 149.961L49.6234\n          155.161L48.6706 155.813L46.7415 154.434ZM43.5491 155.496L45.9433 153.859L42.4915 151.385L43.5491\n          155.496ZM53.2034 150.016L50.253 152.033L50.8471 154.324L49.8895 154.979L47.7633 146.098L48.5759\n          145.542L56.0853 150.743L55.1325 151.394L53.2034 150.016ZM50.011 151.077L52.4052 149.44L48.9534 146.967L50.011\n          151.077Z");
    			attr_dev(path57, "fill", "black");
    			add_location(path57, file$5, 520, 8, 31826);
    			attr_dev(path58, "d", "M17.7295 71.4491C20.6687 64.4141 24.4028 57.7384 28.8591 51.552L69.4295 80.776C67.2014 83.8692 65.3343\n          87.2071 63.8647 90.7245L17.7295 71.4491Z");
    			attr_dev(path58, "fill", "#DADAEB");
    			add_location(path58, file$5, 527, 8, 32336);
    			attr_dev(path59, "d", "M42.4988 73.3581L39.3795 71.6133L37.5919 73.1646L36.5794 72.5983L43.5874 66.743L44.4465 67.2236L43.1301\n          76.2624L42.1227 75.6989L42.4988 73.3581ZM40.128 70.9712L42.6593 72.3871L43.339 68.1953L40.128 70.9712ZM48.1826\n          74.7314C47.4759 74.0183 47.0282 73.3785 46.8394 72.8118C46.6559 72.2437 46.709 71.7005 46.9989 71.1824C47.3269\n          70.596 47.8312 70.2425 48.5118 70.1219C49.1978 69.9998 49.9158 70.1486 50.6658 70.5681C51.1771 70.8541 51.577\n          71.2076 51.8652 71.6284C52.1569 72.0512 52.3146 72.4974 52.3383 72.9672C52.3654 73.4389 52.2635 73.881 52.0328\n          74.2935L51.0458 73.7415C51.2976 73.2914 51.3517 72.8585 51.2084 72.4426C51.0669 72.0234 50.7354 71.6678\n          50.2138 71.3761C49.7297 71.1053 49.2912 71.001 48.8984 71.0632C48.5108 71.1239 48.2112 71.3435 47.9995\n          71.7219C47.8298 72.0253 47.8137 72.3542 47.9511 72.7086C48.0939 73.0615 48.4252 73.4975 48.945 74.0165C49.4682\n          74.5374 49.8446 75.0008 50.0741 75.4067C50.3089 75.8111 50.4317 76.1998 50.4423 76.5728C50.4564 76.9477\n          50.3576 77.3243 50.146 77.7027C49.8084 78.3062 49.3024 78.6587 48.6279 78.7603C47.9553 78.8585 47.2253 78.6874\n          46.4377 78.2469C45.9264 77.9608 45.5034 77.5967 45.1689 77.1545C44.8363 76.7088 44.6444 76.2479 44.593\n          75.7716C44.5451 75.2971 44.6422 74.8435 44.8844 74.4105L45.8713 74.9626C45.6196 75.4126 45.5857 75.8613\n          45.7695 76.3088C45.9587 76.7548 46.3311 77.1332 46.8868 77.444C47.405 77.7339 47.8613 77.8503 48.2557\n          77.7934C48.65 77.7365 48.9492 77.5257 49.1533 77.1609C49.3573 76.7961 49.3868 76.4434 49.2417 76.1026C49.0985\n          75.7584 48.7455 75.3014 48.1826 74.7314Z");
    			attr_dev(path59, "fill", "black");
    			add_location(path59, file$5, 531, 8, 32546);
    			attr_dev(path60, "d", "M74.8625 16.3765C77.4095 15.4206 79.9943 14.5691 82.6106 13.824L96.3053 61.912C94.9972 62.2845 93.7047\n          62.7103 92.4313 63.1882L74.8625 16.3765Z");
    			attr_dev(path60, "fill", "#636363");
    			add_location(path60, file$5, 548, 8, 34280);
    			attr_dev(path61, "d", "M28.8591 51.5521C33.3154 45.3657 38.4645 39.7092 44.2061 34.6929L77.103 72.3464C74.2322 74.8546 71.6577\n          77.6828 69.4296 80.776L28.8591 51.5521Z");
    			attr_dev(path61, "fill", "#9ECAE1");
    			add_location(path61, file$5, 552, 8, 34490);
    			attr_dev(path62, "d", "M53.2933 59.0463C52.6079 59.6425 51.8915 59.9333 51.1442 59.9186C50.4025 59.9037 49.6878 59.5833 49.0003\n          58.9575C48.2551 58.2791 47.9003 57.4675 47.9362 56.5229C47.9749 55.581 48.4018 54.6622 49.217 53.7667L49.7692\n          53.1601C50.303 52.5737 50.8764 52.1528 51.4893 51.8973C52.1051 51.6444 52.7129 51.5743 53.3128 51.6872C53.9152\n          51.7972 54.4692 52.0822 54.9747 52.5424C55.6449 53.1525 56.0112 53.8293 56.0738 54.573C56.139 55.3138 55.9037\n          56.0451 55.368 56.7671L54.5317 56.0059C54.9171 55.4375 55.091 54.9302 55.0534 54.484C55.0188 54.0405 54.7848\n          53.6215 54.3515 53.227C53.82 52.7432 53.2238 52.5596 52.5628 52.6764C51.9048 52.7958 51.2458 53.218 50.5858\n          53.9431L50.0296 54.554C49.4064 55.2386 49.0537 55.9133 48.9716 56.578C48.8894 57.2428 49.1054 57.8092 49.6196\n          58.2772C50.0818 58.6979 50.5303 58.9161 50.9652 58.9316C51.4055 58.9469 51.9028 58.7313 52.457 58.285L53.2933\n          59.0463ZM60.1496 63.5523C59.5869 64.1705 58.9912 64.616 58.3624 64.8889C57.7364 65.1588 57.1222 65.2416\n          56.5201 65.1371C55.9179 65.0327 55.3626 64.7491 54.8542 64.2863C54.3573 63.834 54.0272 63.3116 53.8639\n          62.7193C53.7033 62.124 53.7211 61.5038 53.9176 60.8586C54.1196 60.2131 54.4885 59.5902 55.0244 58.9899L55.4386\n          58.5349C55.9908 57.9283 56.584 57.4884 57.2182 57.2153C57.8524 56.9422 58.4734 56.8577 59.0811 56.9619C59.6943\n          57.0659 60.2494 57.344 60.7462 57.7962C61.2517 58.2564 61.5848 58.7841 61.7455 59.3794C61.9117 59.9744 61.8871\n          60.5991 61.6717 61.2535C61.459 61.905 61.0726 62.5384 60.5125 63.1537L60.1496 63.5523ZM59.6928 62.3917C60.3738\n          61.6435 60.7456 60.9334 60.808 60.2613C60.8731 59.5863 60.6356 59.0029 60.0954 58.5112C59.5697 58.0326 58.9724\n          57.856 58.3036 57.9814C57.6403 58.1066 56.9809 58.5205 56.3253 59.2233L55.9033 59.6869C55.2433 60.4119 54.8756\n          61.1205 54.8002 61.8126C54.7304 62.5044 54.9627 63.0935 55.4971 63.58C56.0344 64.0691 56.6278 64.2527 57.2775\n          64.131C57.9297 64.0064 58.5928 63.5826 59.2668 62.8596L59.6928 62.3917Z");
    			attr_dev(path62, "fill", "black");
    			add_location(path62, file$5, 556, 8, 34700);
    			attr_dev(path63, "d", "M44.2061 34.6929C49.126 30.3945 54.4554 26.5885 60.1177 23.3296L85.0588 66.6648C82.2277 68.2943 79.563\n          70.1973 77.103 72.3465L44.2061 34.6929Z");
    			attr_dev(path63, "fill", "#C6DBEF");
    			add_location(path63, file$5, 576, 8, 36852);
    			attr_dev(path64, "d", "M98.6008 10.6519C100.763 10.4038 102.932 10.2264 105.106 10.1199L107.553 60.06C106.466 60.1132 105.381\n          60.2019 104.3 60.326L98.6008 10.6519Z");
    			attr_dev(path64, "fill", "#FD8D3C");
    			add_location(path64, file$5, 580, 8, 37061);
    			attr_dev(path65, "d", "M105.106 10.1199C106.193 10.0667 107.28 10.0312 108.368 10.0134L109.184 60.0068C108.64 60.0156 108.096\n          60.0334 107.553 60.06L105.106 10.1199Z");
    			attr_dev(path65, "fill", "#FDAE6B");
    			add_location(path65, file$5, 584, 8, 37268);
    			attr_dev(path66, "d", "M108.368 10.0133C108.912 10.0044 109.456 10 110 10V60C109.728 60 109.456 60.0022 109.184 60.0067L108.368\n          10.0133Z");
    			attr_dev(path66, "fill", "#969696");
    			add_location(path66, file$5, 588, 8, 37476);
    			attr_dev(path67, "d", "M82.6106 13.8241C85.2269 13.079 87.8726 12.441 90.541 11.9116L100.27 60.9559C98.9363 61.2205 97.6135\n          61.5395 96.3053 61.9121L82.6106 13.8241Z");
    			attr_dev(path67, "fill", "#FDD0A2");
    			add_location(path67, file$5, 592, 8, 37656);
    			attr_dev(path68, "d", "M60.1179 23.3295C64.8354 20.6144 69.7667 18.289 74.8626 16.3765L92.4314 63.1882C89.8834 64.1445 87.4177\n          65.3072 85.059 66.6647L60.1179 23.3295Z");
    			attr_dev(path68, "fill", "#31A354");
    			add_location(path68, file$5, 596, 8, 37864);
    			attr_dev(path69, "d", "M199.193 155.217C192.4 168.617 182.675 180.314 170.741 189.439C158.807 198.564 144.97 204.883 130.259\n          207.926C115.547 210.97 100.339 210.66 85.7637 207.019C71.1886 203.378 57.6211 196.499 46.0691 186.895L78.0345\n          148.448C83.8105 153.25 90.5943 156.689 97.8818 158.509C105.169 160.33 112.774 160.485 120.129 158.963C127.485\n          157.442 134.403 154.282 140.371 149.719C146.338 145.157 151.2 139.308 154.596 132.609L199.193 155.217Z");
    			attr_dev(path69, "fill", "#A1D99B");
    			add_location(path69, file$5, 600, 8, 38074);
    			attr_dev(path70, "d", "M125.776 182.357C124.957 182.527 124.214 182.537 123.545 182.388C122.879 182.238 122.334 181.944 121.908\n          181.506C121.482 181.068 121.2 180.512 121.061 179.838C120.924 179.18 120.964 178.564 121.18 177.989C121.4\n          177.413 121.779 176.921 122.318 176.515C122.86 176.111 123.525 175.824 124.311 175.654L124.914 175.529C125.717\n          175.363 126.456 175.356 127.129 175.507C127.803 175.659 128.355 175.956 128.785 176.397C129.22 176.842 129.506\n          177.393 129.642 178.051C129.781 178.721 129.74 179.343 129.52 179.919C129.305 180.498 128.918 180.989 128.359\n          181.392C127.804 181.794 127.119 182.079 126.304 182.248L125.776 182.357ZM126.089 181.15C127.079 180.945\n          127.798 180.589 128.243 180.082C128.693 179.574 128.843 178.962 128.695 178.247C128.551 177.551 128.172\n          177.057 127.557 176.765C126.947 176.477 126.17 176.424 125.227 176.607L124.613 176.734C123.653 176.933 122.939\n          177.29 122.471 177.805C122.008 178.324 121.849 178.937 121.996 179.645C122.143 180.356 122.515 180.854 123.112\n          181.137C123.713 181.42 124.499 181.467 125.469 181.278L126.089 181.15ZM127.447 190.436C126.629 190.606 125.885\n          190.616 125.216 190.467C124.551 190.317 124.005 190.023 123.579 189.585C123.154 189.146 122.871 188.591\n          122.732 187.917C122.596 187.259 122.636 186.643 122.852 186.068C123.072 185.492 123.451 185 123.989\n          184.594C124.532 184.19 125.196 183.903 125.983 183.733L126.585 183.608C127.389 183.442 128.127 183.435 128.801\n          183.586C129.474 183.738 130.026 184.035 130.457 184.476C130.892 184.921 131.177 185.472 131.313 186.13C131.452\n          186.799 131.411 187.422 131.191 187.998C130.976 188.577 130.589 189.068 130.03 189.471C129.475 189.873 128.79\n          190.158 127.975 190.327L127.447 190.436ZM127.76 189.229C128.751 189.024 129.469 188.668 129.914\n          188.161C130.364 187.653 130.515 187.041 130.367 186.326C130.223 185.63 129.843 185.136 129.228 184.844C128.618\n          184.556 127.841 184.503 126.898 184.686L126.284 184.813C125.324 185.012 124.61 185.369 124.142 185.884C123.679\n          186.403 123.521 187.016 123.667 187.724C123.814 188.435 124.187 188.933 124.784 189.216C125.385 189.499 126.17\n          189.546 127.14 189.357L127.76 189.229Z");
    			attr_dev(path70, "fill", "black");
    			add_location(path70, file$5, 606, 8, 38585);
    			attr_dev(path71, "d", "M110 10C127.093 10 143.9 14.3813 158.818 22.7255C173.735 31.0697 186.265 43.0984 195.211 57.6632C204.156\n          72.228 209.22 88.8427 209.917 105.921C210.614 123 206.922 139.972 199.193 155.217L154.597 132.609C158.461\n          124.986 160.307 116.5 159.958 107.961C159.61 99.4213 157.078 91.114 152.605 83.8316C148.132 76.5492 141.868\n          70.5349 134.409 66.3627C126.95 62.1906 118.546 60 110 60L110 10Z");
    			attr_dev(path71, "fill", "#C7E9C0");
    			add_location(path71, file$5, 628, 8, 40917);
    			attr_dev(path72, "d", "M170.262 66.7299L173.298 71.6728C173.716 72.3606 173.844 73.0543 173.683 73.7541C173.524 74.4518 173.095\n          75.0522 172.396 75.5552L172.147 75.7216C171.352 76.2102 170.586 76.385 169.85 76.2459C169.113 76.1068 168.511\n          75.6632 168.042 74.915L165 69.9622L165.948 69.3795L168.972 74.3024C169.295 74.8283 169.691 75.1488 170.161\n          75.2638C170.628 75.3756 171.13 75.2669 171.666 74.9377C172.208 74.6045 172.534 74.2051 172.642 73.7397C172.754\n          73.2723 172.648 72.7756 172.325 72.2497L169.299 67.3218L170.262 66.7299ZM178.979 68.7749L175.934\n          70.6456L176.415 72.963L175.426 73.5702L173.737 64.5956L174.576 64.0804L181.822 69.6418L180.838 70.246L178.979\n          68.7749ZM175.739 69.6788L178.21 68.1609L174.883 65.5213L175.739 69.6788Z");
    			attr_dev(path72, "fill", "black");
    			add_location(path72, file$5, 634, 8, 41387);
    			attr_dev(path73, "d", "M10.2405 103.07C10.9962 92.1917 13.526 81.5106 17.7296 71.4492L63.8648 90.7247C61.763 95.7553 60.4981\n          101.096 60.1203 106.535L10.2405 103.07Z");
    			attr_dev(path73, "fill", "#756BB1");
    			add_location(path73, file$5, 643, 8, 42214);
    			attr_dev(path74, "d", "M37.7573 87.4112L36.4204 93.0558C36.2312 93.8379 35.8324 94.4199 35.2241 94.8017C34.6197 95.1844 33.8921\n          95.3071 33.0415 95.1699L32.748 95.1124C31.8395 94.8972 31.1735 94.4806 30.7499 93.8624C30.3262 93.2442 30.2124\n          92.5047 30.4082 91.6439L31.7478 85.9878L32.8311 86.2444L31.4996 91.8662C31.3574 92.4668 31.412 92.9735 31.6635\n          93.3863C31.9158 93.7953 32.348 94.0723 32.96 94.2173C33.5796 94.364 34.092 94.3107 34.4972 94.0575C34.9062\n          93.8051 35.1818 93.3786 35.3241 92.778L36.6569 87.1505L37.7573 87.4112ZM40.8412 93.0009C39.9662 92.5086\n          39.3603 92.0159 39.0235 91.5226C38.6915 91.0265 38.5938 90.4895 38.7307 89.9118C38.8855 89.258 39.2737 88.7799\n          39.8953 88.4775C40.5216 88.1722 41.2528 88.1186 42.0891 88.3167C42.6593 88.4517 43.1406 88.6821 43.5331\n          89.0079C43.9294 89.3346 44.2033 89.7206 44.3547 90.166C44.51 90.6122 44.5331 91.0653 44.4242 91.5252L43.3238\n          91.2646C43.4426 90.7628 43.3762 90.3316 43.1244 89.9709C42.8735 89.6064 42.4573 89.3553 41.8757 89.2175C41.336\n          89.0897 40.8857 89.1095 40.5249 89.277C40.1688 89.4415 39.9408 89.7347 39.8408 90.1567C39.7607 90.4949 39.8353\n          90.8157 40.0645 91.1189C40.2985 91.4192 40.7365 91.7477 41.3786 92.1045C42.0245 92.4622 42.5134 92.8048\n          42.8453 93.1323C43.1819 93.4569 43.4064 93.7971 43.5188 94.1529C43.6351 94.5096 43.6432 94.8989 43.5433\n          95.3208C43.3839 95.9936 42.9938 96.4713 42.3729 96.7538C41.753 97.0324 41.004 97.0678 40.1259 96.8598C39.5557\n          96.7248 39.0492 96.4904 38.6064 96.1567C38.1645 95.8192 37.8536 95.4285 37.6737 94.9844C37.4977 94.5413\n          37.4668 94.0784 37.5812 93.5956L38.6816 93.8563C38.5628 94.358 38.653 94.7989 38.9524 95.1789C39.2565 95.556\n          39.7183 95.8179 40.3379 95.9647C40.9157 96.1015 41.3864 96.0886 41.7501 95.9258C42.1138 95.7631 42.3438\n          95.4783 42.4402 95.0716C42.5365 94.6649 42.4682 94.3176 42.2354 94.0296C42.0034 93.7378 41.5387 93.3949\n          40.8412 93.0009Z");
    			attr_dev(path74, "fill", "black");
    			add_location(path74, file$5, 647, 8, 42422);
    			attr_dev(path75, "d", "M15.1497 141.677C11.0007 129.253 9.33271 116.136 10.2404 103.07L60.1202 106.535C59.6664 113.068 60.5004\n          119.627 62.5748 125.838L15.1497 141.677Z");
    			attr_dev(path75, "fill", "#BDBDBD");
    			add_location(path75, file$5, 667, 8, 44486);
    			attr_dev(path76, "d", "M28.5509 120.872L28.8555 121.967L28.966 120.931L29.889 114.813L30.8307 114.693L33.215 120.391L33.5775\n          121.384L33.6129 120.222L34.1903 114.266L35.3122 114.123L34.3365 122.847L33.3193 122.976L30.7913\n          117.031L30.5756 116.403L30.5239 117.065L29.5004 123.462L28.4832 123.591L25.3611 115.388L26.4771\n          115.246L28.5509 120.872ZM44.1365 121.601L43.0147 121.743L37.9248 115.764L38.754 122.285L37.6322\n          122.428L36.5561 113.965L37.6779 113.822L42.7831 119.83L41.9501 113.279L43.0603 113.138L44.1365 121.601Z");
    			attr_dev(path76, "fill", "black");
    			add_location(path76, file$5, 671, 8, 44697);
    			attr_dev(path77, "d", "M90.541 11.9116C93.2094 11.3822 95.8982 10.962 98.6009 10.6519L104.3 60.3259C102.949 60.481 101.605 60.6911\n          100.271 60.9558L90.541 11.9116Z");
    			attr_dev(path77, "fill", "#9E9AC8");
    			add_location(path77, file$5, 678, 8, 45285);
    			attr_dev(svg3, "width", "220");
    			attr_dev(svg3, "height", "220");
    			attr_dev(svg3, "viewBox", "0 0 220 220");
    			attr_dev(svg3, "fill", "none");
    			attr_dev(svg3, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg3, file$5, 489, 6, 28823);
    			attr_dev(div, "slot", "chart");
    			attr_dev(div, "class", "chart svelte-yw2vvh");
    			add_location(div, file$5, 153, 4, 4252);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg0);
    			append_dev(svg0, path0);
    			append_dev(svg0, path1);
    			append_dev(svg0, path2);
    			append_dev(svg0, path3);
    			append_dev(svg0, path4);
    			append_dev(svg0, path5);
    			append_dev(svg0, path6);
    			append_dev(svg0, path7);
    			append_dev(svg0, path8);
    			append_dev(svg0, path9);
    			append_dev(svg0, path10);
    			append_dev(svg0, path11);
    			append_dev(svg0, path12);
    			append_dev(svg0, path13);
    			append_dev(svg0, path14);
    			append_dev(svg0, path15);
    			append_dev(svg0, path16);
    			append_dev(svg0, path17);
    			append_dev(svg0, path18);
    			append_dev(div, t0);
    			append_dev(div, svg1);
    			append_dev(svg1, path19);
    			append_dev(svg1, path20);
    			append_dev(svg1, path21);
    			append_dev(svg1, path22);
    			append_dev(svg1, path23);
    			append_dev(svg1, path24);
    			append_dev(svg1, path25);
    			append_dev(svg1, path26);
    			append_dev(svg1, path27);
    			append_dev(svg1, path28);
    			append_dev(svg1, path29);
    			append_dev(svg1, path30);
    			append_dev(svg1, path31);
    			append_dev(svg1, path32);
    			append_dev(svg1, path33);
    			append_dev(svg1, path34);
    			append_dev(svg1, path35);
    			append_dev(div, t1);
    			append_dev(div, svg2);
    			append_dev(svg2, path36);
    			append_dev(svg2, path37);
    			append_dev(svg2, path38);
    			append_dev(svg2, path39);
    			append_dev(svg2, path40);
    			append_dev(svg2, path41);
    			append_dev(svg2, path42);
    			append_dev(svg2, path43);
    			append_dev(svg2, path44);
    			append_dev(svg2, path45);
    			append_dev(svg2, path46);
    			append_dev(svg2, path47);
    			append_dev(svg2, path48);
    			append_dev(svg2, path49);
    			append_dev(svg2, path50);
    			append_dev(svg2, path51);
    			append_dev(svg2, path52);
    			append_dev(svg2, path53);
    			append_dev(svg2, path54);
    			append_dev(div, t2);
    			append_dev(div, svg3);
    			append_dev(svg3, path55);
    			append_dev(svg3, path56);
    			append_dev(svg3, path57);
    			append_dev(svg3, path58);
    			append_dev(svg3, path59);
    			append_dev(svg3, path60);
    			append_dev(svg3, path61);
    			append_dev(svg3, path62);
    			append_dev(svg3, path63);
    			append_dev(svg3, path64);
    			append_dev(svg3, path65);
    			append_dev(svg3, path66);
    			append_dev(svg3, path67);
    			append_dev(svg3, path68);
    			append_dev(svg3, path69);
    			append_dev(svg3, path70);
    			append_dev(svg3, path71);
    			append_dev(svg3, path72);
    			append_dev(svg3, path73);
    			append_dev(svg3, path74);
    			append_dev(svg3, path75);
    			append_dev(svg3, path76);
    			append_dev(svg3, path77);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_chart_slot.name, type: "slot", source: "(154:4) <div slot=\"chart\" class=\"chart\">", ctx });
    	return block;
    }

    // (687:6) {#each pieMarks as { text, color }}
    function create_each_block$2(ctx) {
    	var div, svg, circle, t0, span, t1_value = ctx.text + "", t1, t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			circle = svg_element("circle");
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(circle, "cx", "7.5");
    			attr_dev(circle, "cy", "7.5");
    			attr_dev(circle, "r", "7.5");
    			attr_dev(circle, "fill", ctx.color);
    			add_location(circle, file$5, 689, 12, 45732);
    			attr_dev(svg, "width", "15");
    			attr_dev(svg, "height", "15");
    			attr_dev(svg, "viewBox", "0 0 15 15");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "class", "svelte-yw2vvh");
    			add_location(svg, file$5, 688, 10, 45624);
    			attr_dev(span, "class", "mark-text svelte-yw2vvh");
    			add_location(span, file$5, 692, 10, 45810);
    			attr_dev(div, "class", "mark svelte-yw2vvh");
    			add_location(div, file$5, 687, 8, 45595);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, circle);
    			append_dev(div, t0);
    			append_dev(div, span);
    			append_dev(span, t1);
    			append_dev(div, t2);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$2.name, type: "each", source: "(687:6) {#each pieMarks as { text, color }}", ctx });
    	return block;
    }

    // (686:4) <div slot="marks" class="marks">
    function create_marks_slot(ctx) {
    	var div;

    	let each_value = ctx.pieMarks;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(div, "slot", "marks");
    			attr_dev(div, "class", "marks svelte-yw2vvh");
    			add_location(div, file$5, 685, 4, 45512);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},

    		p: function update(changed, ctx) {
    			if (changed.pieMarks) {
    				each_value = ctx.pieMarks;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_marks_slot.name, type: "slot", source: "(686:4) <div slot=\"marks\" class=\"marks\">", ctx });
    	return block;
    }

    // (149:2) <Widget>
    function create_default_slot_2(ctx) {
    	var t0, t1;

    	const block = {
    		c: function create() {
    			t0 = space();
    			t1 = space();
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(t1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_2.name, type: "slot", source: "(149:2) <Widget>", ctx });
    	return block;
    }

    // (699:4) <div class="section-title" slot="name">
    function create_name_slot_1(ctx) {
    	var div, img, t, span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t = space();
    			span = element("span");
    			span.textContent = "Рождаемость";
    			attr_dev(img, "src", "./images/high_grad.png");
    			attr_dev(img, "alt", "graduation");
    			attr_dev(img, "height", "22px");
    			attr_dev(img, "width", "20px");
    			attr_dev(img, "class", "svelte-yw2vvh");
    			add_location(img, file$5, 699, 6, 45988);
    			attr_dev(span, "class", "svelte-yw2vvh");
    			add_location(span, file$5, 700, 6, 46075);
    			attr_dev(div, "class", "section-title svelte-yw2vvh");
    			attr_dev(div, "slot", "name");
    			add_location(div, file$5, 698, 4, 45942);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    			append_dev(div, span);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_name_slot_1.name, type: "slot", source: "(699:4) <div class=\"section-title\" slot=\"name\">", ctx });
    	return block;
    }

    // (698:2) <Widget chart={HorizontalBarChart}>
    function create_default_slot_1(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		d: noop
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1.name, type: "slot", source: "(698:2) <Widget chart={HorizontalBarChart}>", ctx });
    	return block;
    }

    // (705:4) <div class="section-title" slot="name">
    function create_name_slot(ctx) {
    	var div, img, t, span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t = space();
    			span = element("span");
    			span.textContent = "Рождаемость";
    			attr_dev(img, "src", "./images/high_grad.png");
    			attr_dev(img, "alt", "graduation");
    			attr_dev(img, "height", "22px");
    			attr_dev(img, "width", "20px");
    			attr_dev(img, "class", "svelte-yw2vvh");
    			add_location(img, file$5, 705, 6, 46204);
    			attr_dev(span, "class", "svelte-yw2vvh");
    			add_location(span, file$5, 706, 6, 46291);
    			attr_dev(div, "class", "section-title svelte-yw2vvh");
    			attr_dev(div, "slot", "name");
    			add_location(div, file$5, 704, 4, 46158);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    			append_dev(div, span);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_name_slot.name, type: "slot", source: "(705:4) <div class=\"section-title\" slot=\"name\">", ctx });
    	return block;
    }

    // (704:2) <Widget chart={BubbleChart}>
    function create_default_slot(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		d: noop
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot.name, type: "slot", source: "(704:2) <Widget chart={BubbleChart}>", ctx });
    	return block;
    }

    function create_fragment$7(ctx) {
    	var div2, div0, svg0, circle, t0, span, t2, div1, svg1, g, path0, path1, defs, clipPath, rect, t3, input, t4, div3, t5, t6, current;

    	var widget0 = new Widget({
    		props: {
    		$$slots: {
    		default: [create_default_slot_2],
    		marks: [create_marks_slot],
    		chart: [create_chart_slot],
    		name: [create_name_slot_2]
    	},
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var widget1 = new Widget({
    		props: {
    		chart: HorizontalBarChart,
    		$$slots: {
    		default: [create_default_slot_1],
    		name: [create_name_slot_1]
    	},
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var widget2 = new Widget({
    		props: {
    		chart: BubbleChart,
    		$$slots: {
    		default: [create_default_slot],
    		name: [create_name_slot]
    	},
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			svg0 = svg_element("svg");
    			circle = svg_element("circle");
    			t0 = space();
    			span = element("span");
    			span.textContent = "ИТОГИ ПЕРЕПИСИ";
    			t2 = space();
    			div1 = element("div");
    			svg1 = svg_element("svg");
    			g = svg_element("g");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			defs = svg_element("defs");
    			clipPath = svg_element("clipPath");
    			rect = svg_element("rect");
    			t3 = space();
    			input = element("input");
    			t4 = space();
    			div3 = element("div");
    			widget0.$$.fragment.c();
    			t5 = space();
    			widget1.$$.fragment.c();
    			t6 = space();
    			widget2.$$.fragment.c();
    			attr_dev(circle, "cx", "10");
    			attr_dev(circle, "cy", "10");
    			attr_dev(circle, "r", "10");
    			attr_dev(circle, "fill", "#FF2929");
    			add_location(circle, file$5, 111, 6, 2227);
    			attr_dev(svg0, "width", "20");
    			attr_dev(svg0, "height", "20");
    			attr_dev(svg0, "viewBox", "0 0 20 20");
    			attr_dev(svg0, "fill", "none");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg0, file$5, 110, 4, 2125);
    			attr_dev(span, "class", "svelte-yw2vvh");
    			add_location(span, file$5, 113, 4, 2291);
    			attr_dev(div0, "class", "title svelte-yw2vvh");
    			add_location(div0, file$5, 109, 2, 2101);
    			attr_dev(path0, "d", "M22.0343 17.3122C25.9894 13.357 25.9893 6.92137 22.0343 2.96616C18.0791 -0.989045 11.6435 -0.989045 7.68841\n          2.96616C4.33295 6.32161 3.82477 11.312 6.16249 15.209C6.16249 15.209 6.33041 15.4907 6.10362 15.7174C4.80981\n          17.0111 0.92813 20.8928 0.92813 20.8928C-0.102006 21.9229 -0.347239 23.3633 0.566282 24.277L0.723569\n          24.4341C1.63709 25.3478 3.07756 25.1026 4.10761 24.0725C4.10761 24.0725 7.98108 20.1989 9.27223\n          18.9079C9.50989 18.6702 9.79153 18.8381 9.79153 18.8381C13.6884 21.1758 18.6788 20.6677 22.0343\n          17.3122ZM9.56119 15.4393C6.6387 12.5168 6.63878 7.76168 9.56127 4.83919C12.4838 1.91678 17.2389 1.91669\n          20.1613 4.83919C23.0838 7.7616 23.0838 12.5168 20.1613 15.4393C17.2389 18.3617 12.4838 18.3617 9.56119\n          15.4393Z");
    			attr_dev(path0, "fill", "#797979");
    			add_location(path0, file$5, 119, 8, 2500);
    			attr_dev(path1, "d", "M10.2079 9.53749C10.0719 9.53749 9.93364 9.51075 9.80035 9.45446C9.26793 9.22912 9.01883 8.61479 9.24417\n          8.08228C10.6605 4.73529 14.5356 3.16459 17.8825 4.5809C18.415 4.80624 18.6641 5.42057 18.4387 5.95307C18.2133\n          6.48558 17.5991 6.73451 17.0665 6.50925C14.783 5.54298 12.1388 6.61468 11.1726 8.89819C11.0036 9.29757 10.6159\n          9.53749 10.2079 9.53749Z");
    			attr_dev(path1, "fill", "#797979");
    			add_location(path1, file$5, 129, 8, 3352);
    			attr_dev(g, "clip-path", "url(#clip0)");
    			add_location(g, file$5, 118, 6, 2464);
    			attr_dev(rect, "width", "25");
    			attr_dev(rect, "height", "25");
    			attr_dev(rect, "fill", "white");
    			add_location(rect, file$5, 138, 10, 3845);
    			attr_dev(clipPath, "id", "clip0");
    			add_location(clipPath, file$5, 137, 8, 3813);
    			add_location(defs, file$5, 136, 6, 3798);
    			attr_dev(svg1, "width", "25");
    			attr_dev(svg1, "height", "25");
    			attr_dev(svg1, "viewBox", "0 0 25 25");
    			attr_dev(svg1, "fill", "none");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "class", "svelte-yw2vvh");
    			add_location(svg1, file$5, 117, 4, 2362);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "search svelte-yw2vvh");
    			attr_dev(input, "placeholder", "Просто начните писать :)");
    			add_location(input, file$5, 143, 4, 3940);
    			attr_dev(div1, "class", "search-group svelte-yw2vvh");
    			add_location(div1, file$5, 116, 2, 2331);
    			attr_dev(div2, "class", "bar svelte-yw2vvh");
    			add_location(div2, file$5, 107, 0, 2080);
    			attr_dev(div3, "class", "container svelte-yw2vvh");
    			add_location(div3, file$5, 146, 0, 4032);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, svg0);
    			append_dev(svg0, circle);
    			append_dev(div0, t0);
    			append_dev(div0, span);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, svg1);
    			append_dev(svg1, g);
    			append_dev(g, path0);
    			append_dev(g, path1);
    			append_dev(svg1, defs);
    			append_dev(defs, clipPath);
    			append_dev(clipPath, rect);
    			append_dev(div1, t3);
    			append_dev(div1, input);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div3, anchor);
    			mount_component(widget0, div3, null);
    			append_dev(div3, t5);
    			mount_component(widget1, div3, null);
    			append_dev(div3, t6);
    			mount_component(widget2, div3, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var widget0_changes = {};
    			if (changed.$$scope) widget0_changes.$$scope = { changed, ctx };
    			widget0.$set(widget0_changes);

    			var widget1_changes = {};
    			if (changed.$$scope) widget1_changes.$$scope = { changed, ctx };
    			widget1.$set(widget1_changes);

    			var widget2_changes = {};
    			if (changed.$$scope) widget2_changes.$$scope = { changed, ctx };
    			widget2.$set(widget2_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(widget0.$$.fragment, local);

    			transition_in(widget1.$$.fragment, local);

    			transition_in(widget2.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(widget0.$$.fragment, local);
    			transition_out(widget1.$$.fragment, local);
    			transition_out(widget2.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div2);
    				detach_dev(t4);
    				detach_dev(div3);
    			}

    			destroy_component(widget0);

    			destroy_component(widget1);

    			destroy_component(widget2);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$7.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$7($$self) {
    	

      const pieMarks = [
        { text: 'Начальное общее (начальное)', color: '#E6550D' },
        { text: 'Основное общее (неполное среднее)', color: '#FDAE6B' },
        { text: 'Среднее (полное) общее', color: '#6BAED6' },
        { text: 'Начальное профессиональное', color: '#31A354' },
        { text: 'Среднее профессиональное', color: '#756BB1' },
        { text: 'Незаконченное высшее', color: '#FDD0A2' },
        { text: 'Высшее', color: '#C7E9C0' },
        { text: 'Не имею образования', color: '#FF914E' },
      ];

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { pieMarks };
    }

    class ChartRoute extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "ChartRoute", options, id: create_fragment$7.name });
    	}
    }

    /* src/routes/RulesRoute.svelte generated by Svelte v3.12.1 */

    const file$6 = "src/routes/RulesRoute.svelte";

    function create_fragment$8(ctx) {
    	var div1, div0, p0, br0, t0, br1, t1, br2, t2, br3, t3, br4, t4, br5, t5, br6, t6, br7, t7, br8, t8, p1, span0, t9, br9, t10, p2, span1, t11, br10, t12, p3, span2, t13, br11, t14, p4, span3, t15, br12, t16, p5, span4, t17, br13, t18, p6, span5, t19, br14, t20, p7, span6, t21, a, t23, br15, t24, br16, t25, p8, t26, br17, t27, br18, t28, br19, t29, br20, t30, p9, br21, t31, br22, t32, br23, t33;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			br0 = element("br");
    			t0 = text("\n      ПРАВИТЕЛЬСТВО РОССИЙСКОЙ ФЕДЕРАЦИИ\n      ");
    			br1 = element("br");
    			t1 = space();
    			br2 = element("br");
    			t2 = text("\n      РАСПОРЯЖЕНИЕ\n      ");
    			br3 = element("br");
    			t3 = space();
    			br4 = element("br");
    			t4 = text("\n      от 4 ноября 2017 года N 2444-р\n      ");
    			br5 = element("br");
    			t5 = space();
    			br6 = element("br");
    			t6 = space();
    			br7 = element("br");
    			t7 = text("\n      [О проведении Всероссийской переписи населения 2020 года]\n      ");
    			br8 = element("br");
    			t8 = space();
    			p1 = element("p");
    			span0 = element("span");
    			t9 = text("\n      1. Провести с 1 по 31 октября 2020 г. Всероссийскую перепись населения. Определить, что моментом, на который\n      осуществляется сбор сведений о населении и его учет, является 0 часов 1 октября 2020 г.\n      ");
    			br9 = element("br");
    			t10 = space();
    			p2 = element("p");
    			span1 = element("span");
    			t11 = text("\n      2. В целях отработки методологических, организационных и технологических вопросов проведения, способов сбора\n      сведений о населении и подведения итогов Всероссийской переписи населения 2020 года провести с 1 по 31 октября\n      2018 г. по состоянию на 0 часов 1 октября 2018 г. пробную перепись населения с охватом ориентировочно 550 тыс.\n      человек.\n      ");
    			br10 = element("br");
    			t12 = space();
    			p3 = element("p");
    			span2 = element("span");
    			t13 = text("\n      3. Определить Росстат ответственным за подготовку и проведение пробной переписи населения и Всероссийской переписи\n      населения 2020 года, обработку полученных сведений, подведение итогов Всероссийской переписи населения 2020 года,\n      их официальное опубликование, хранение переписных листов и иных документов Всероссийской переписи населения 2020\n      года и ее методологическое обеспечение.\n      ");
    			br11 = element("br");
    			t14 = space();
    			p4 = element("p");
    			span3 = element("span");
    			t15 = text("\n      4. Минэкономразвития России по представлению Росстата внести в Правительство Российской Федерации проекты\n      следующих актов Правительства Российской Федерации:\n      ");
    			br12 = element("br");
    			t16 = space();
    			p5 = element("p");
    			span4 = element("span");
    			t17 = text("\n      в IV квартале 2018 г. - постановление Правительства Российской Федерации об организации Всероссийской переписи\n      населения 2020 года;\n      ");
    			br13 = element("br");
    			t18 = space();
    			p6 = element("p");
    			span5 = element("span");
    			t19 = text("\n      в III квартале 2019 г. - постановление Правительства Российской Федерации о предоставлении субвенций из\n      федерального бюджета бюджетам субъектов Российской Федерации на осуществление полномочий Российской Федерации по\n      подготовке и проведению Всероссийской переписи населения 2020 года.\n      ");
    			br14 = element("br");
    			t20 = space();
    			p7 = element("p");
    			span6 = element("span");
    			t21 = text("\n      5. Финансовое обеспечение расходов, связанных с подготовкой и проведением пробной переписи населения и\n      Всероссийской переписи населения 2020 года, обработкой полученных сведений, подведением и опубликованием итогов\n      Всероссийской переписи населения 2020 года, хранением переписных листов и иных документов Всероссийской переписи\n      населения 2020 года, осуществлять в пределах бюджетных ассигнований, предусмотренных Росстату, а также органам\n      исполнительной власти субъектов Российской Федерации на осуществление полномочий Российской Федерации по\n      подготовке и проведению Всероссийской переписи населения 2020 года, переданных в соответствии с\n      ");
    			a = element("a");
    			a.textContent = "Федеральным законом \"О Всероссийской переписи населения\"";
    			t23 = text("\n      , в федеральном бюджете на соответствующий финансовый год и плановый период.\n      ");
    			br15 = element("br");
    			t24 = space();
    			br16 = element("br");
    			t25 = space();
    			p8 = element("p");
    			t26 = text("Председатель Правительства\n      ");
    			br17 = element("br");
    			t27 = text("\n      Российской Федерации\n      ");
    			br18 = element("br");
    			t28 = text("\n      Д.Медведев\n      ");
    			br19 = element("br");
    			t29 = space();
    			br20 = element("br");
    			t30 = space();
    			p9 = element("p");
    			br21 = element("br");
    			t31 = text("\n      Электронный текст документа\n      ");
    			br22 = element("br");
    			t32 = text("\n      подготовлен АО \"Кодекс\" и сверен по:\n      ");
    			br23 = element("br");
    			t33 = text("\n      электронный текст НТЦ \"Система\"");
    			add_location(br0, file$6, 31, 6, 616);
    			add_location(br1, file$6, 33, 6, 670);
    			add_location(br2, file$6, 34, 6, 683);
    			add_location(br3, file$6, 36, 6, 715);
    			add_location(br4, file$6, 37, 6, 728);
    			add_location(br5, file$6, 39, 6, 778);
    			add_location(br6, file$6, 40, 6, 791);
    			add_location(br7, file$6, 41, 6, 804);
    			add_location(br8, file$6, 43, 6, 881);
    			attr_dev(p0, "id", "P0001");
    			attr_dev(p0, "class", "headertext topleveltext centertext");
    			attr_dev(p0, "align", "center");
    			add_location(p0, file$6, 30, 4, 537);
    			attr_dev(span0, "id", "redstr");
    			set_style(span0, "display", "inline-block");
    			set_style(span0, "width", "20px");
    			add_location(span0, file$6, 46, 6, 970);
    			add_location(br9, file$6, 49, 6, 1247);
    			attr_dev(p1, "id", "P0003");
    			attr_dev(p1, "class", "formattext topleveltext");
    			attr_dev(p1, "align", "justify");
    			add_location(p1, file$6, 45, 4, 901);
    			attr_dev(span1, "id", "redstr");
    			set_style(span1, "display", "inline-block");
    			set_style(span1, "width", "20px");
    			add_location(span1, file$6, 52, 6, 1336);
    			add_location(br10, file$6, 57, 6, 1768);
    			attr_dev(p2, "id", "P0005");
    			attr_dev(p2, "class", "formattext topleveltext");
    			attr_dev(p2, "align", "justify");
    			add_location(p2, file$6, 51, 4, 1267);
    			attr_dev(span2, "id", "redstr");
    			set_style(span2, "display", "inline-block");
    			set_style(span2, "width", "20px");
    			add_location(span2, file$6, 60, 6, 1857);
    			add_location(br11, file$6, 65, 6, 2331);
    			attr_dev(p3, "id", "P0007");
    			attr_dev(p3, "class", "formattext topleveltext");
    			attr_dev(p3, "align", "justify");
    			add_location(p3, file$6, 59, 4, 1788);
    			attr_dev(span3, "id", "redstr");
    			set_style(span3, "display", "inline-block");
    			set_style(span3, "width", "20px");
    			add_location(span3, file$6, 68, 6, 2420);
    			add_location(br12, file$6, 71, 6, 2658);
    			attr_dev(p4, "id", "P0009");
    			attr_dev(p4, "class", "formattext topleveltext");
    			attr_dev(p4, "align", "justify");
    			add_location(p4, file$6, 67, 4, 2351);
    			attr_dev(span4, "id", "redstr");
    			set_style(span4, "display", "inline-block");
    			set_style(span4, "width", "20px");
    			add_location(span4, file$6, 74, 6, 2747);
    			add_location(br13, file$6, 77, 6, 2959);
    			attr_dev(p5, "id", "P000A");
    			attr_dev(p5, "class", "formattext topleveltext");
    			attr_dev(p5, "align", "justify");
    			add_location(p5, file$6, 73, 4, 2678);
    			attr_dev(span5, "id", "redstr");
    			set_style(span5, "display", "inline-block");
    			set_style(span5, "width", "20px");
    			add_location(span5, file$6, 80, 6, 3048);
    			add_location(br14, file$6, 84, 6, 3419);
    			attr_dev(p6, "id", "P000B");
    			attr_dev(p6, "class", "formattext topleveltext");
    			attr_dev(p6, "align", "justify");
    			add_location(p6, file$6, 79, 4, 2979);
    			attr_dev(span6, "id", "redstr");
    			set_style(span6, "display", "inline-block");
    			set_style(span6, "width", "20px");
    			add_location(span6, file$6, 87, 6, 3508);
    			attr_dev(a, "href", "/document/901809190");
    			add_location(a, file$6, 94, 6, 4252);
    			add_location(br15, file$6, 96, 6, 4432);
    			add_location(br16, file$6, 97, 6, 4445);
    			attr_dev(p7, "id", "P000D");
    			attr_dev(p7, "class", "formattext topleveltext");
    			attr_dev(p7, "align", "justify");
    			add_location(p7, file$6, 86, 4, 3439);
    			add_location(br17, file$6, 101, 6, 4565);
    			add_location(br18, file$6, 103, 6, 4605);
    			add_location(br19, file$6, 105, 6, 4635);
    			add_location(br20, file$6, 106, 6, 4648);
    			attr_dev(p8, "id", "P000E");
    			attr_dev(p8, "class", "formattext topleveltext");
    			attr_dev(p8, "align", "right");
    			add_location(p8, file$6, 99, 4, 4465);
    			add_location(br21, file$6, 109, 6, 4737);
    			add_location(br22, file$6, 111, 6, 4784);
    			add_location(br23, file$6, 113, 6, 4840);
    			attr_dev(p9, "id", "P000F");
    			attr_dev(p9, "class", "formattext topleveltext");
    			attr_dev(p9, "align", "justify");
    			add_location(p9, file$6, 108, 4, 4668);
    			attr_dev(div0, "id", "doc_with_soderjanie");
    			attr_dev(div0, "class", "text svelte-fmjimi");
    			add_location(div0, file$6, 28, 2, 488);
    			attr_dev(div1, "class", "container svelte-fmjimi");
    			add_location(div1, file$6, 26, 0, 461);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, p0);
    			append_dev(p0, br0);
    			append_dev(p0, t0);
    			append_dev(p0, br1);
    			append_dev(p0, t1);
    			append_dev(p0, br2);
    			append_dev(p0, t2);
    			append_dev(p0, br3);
    			append_dev(p0, t3);
    			append_dev(p0, br4);
    			append_dev(p0, t4);
    			append_dev(p0, br5);
    			append_dev(p0, t5);
    			append_dev(p0, br6);
    			append_dev(p0, t6);
    			append_dev(p0, br7);
    			append_dev(p0, t7);
    			append_dev(p0, br8);
    			append_dev(div0, t8);
    			append_dev(div0, p1);
    			append_dev(p1, span0);
    			append_dev(p1, t9);
    			append_dev(p1, br9);
    			append_dev(div0, t10);
    			append_dev(div0, p2);
    			append_dev(p2, span1);
    			append_dev(p2, t11);
    			append_dev(p2, br10);
    			append_dev(div0, t12);
    			append_dev(div0, p3);
    			append_dev(p3, span2);
    			append_dev(p3, t13);
    			append_dev(p3, br11);
    			append_dev(div0, t14);
    			append_dev(div0, p4);
    			append_dev(p4, span3);
    			append_dev(p4, t15);
    			append_dev(p4, br12);
    			append_dev(div0, t16);
    			append_dev(div0, p5);
    			append_dev(p5, span4);
    			append_dev(p5, t17);
    			append_dev(p5, br13);
    			append_dev(div0, t18);
    			append_dev(div0, p6);
    			append_dev(p6, span5);
    			append_dev(p6, t19);
    			append_dev(p6, br14);
    			append_dev(div0, t20);
    			append_dev(div0, p7);
    			append_dev(p7, span6);
    			append_dev(p7, t21);
    			append_dev(p7, a);
    			append_dev(p7, t23);
    			append_dev(p7, br15);
    			append_dev(p7, t24);
    			append_dev(p7, br16);
    			append_dev(div0, t25);
    			append_dev(div0, p8);
    			append_dev(p8, t26);
    			append_dev(p8, br17);
    			append_dev(p8, t27);
    			append_dev(p8, br18);
    			append_dev(p8, t28);
    			append_dev(p8, br19);
    			append_dev(p8, t29);
    			append_dev(p8, br20);
    			append_dev(div0, t30);
    			append_dev(div0, p9);
    			append_dev(p9, br21);
    			append_dev(p9, t31);
    			append_dev(p9, br22);
    			append_dev(p9, t32);
    			append_dev(p9, br23);
    			append_dev(p9, t33);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$8.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$8($$self) {

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return {};
    }

    class RulesRoute extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "RulesRoute", options, id: create_fragment$8.name });
    	}
    }

    /* src/routes/PartnersRoute.svelte generated by Svelte v3.12.1 */

    const file$7 = "src/routes/PartnersRoute.svelte";

    function create_fragment$9(ctx) {
    	var div, p, t_1, button, dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			p.textContent = "Для участия в партнерской программе отправьте вашу заявку с подробным описанием вашей компании на нашу рабочую почту\n    и мы обязательно с Вами свяжемся.";
    			t_1 = space();
    			button = element("button");
    			button.textContent = "Оставить заявку";
    			attr_dev(p, "class", "text svelte-1e3brh8");
    			add_location(p, file$7, 36, 2, 706);
    			attr_dev(button, "class", "be-apart svelte-1e3brh8");
    			attr_dev(button, "type", "button");
    			add_location(button, file$7, 41, 2, 892);
    			attr_dev(div, "class", "container svelte-1e3brh8");
    			add_location(div, file$7, 35, 0, 680);
    			dispose = listen_dev(button, "click", click_handler$1);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(div, t_1);
    			append_dev(div, button);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$9.name, type: "component", source: "", ctx });
    	return block;
    }

    const click_handler$1 = () => window.location.replace('https://kazan-poll.firebaseapp.com');

    function instance$9($$self) {

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return {};
    }

    class PartnersRoute extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "PartnersRoute", options, id: create_fragment$9.name });
    	}
    }

    /* src/App.svelte generated by Svelte v3.12.1 */

    const file$8 = "src/App.svelte";

    // (195:4) <Link to="/">
    function create_default_slot_5(ctx) {
    	var svg, g, path0, path1, path2, path3, path4, path5, path6, path7, path8, path9, path10, path11, path12, path13, path14, path15, path16, path17, path18, path19, path20, path21, path22, path23, path24, path25, path26, path27, path28, path29, path30, path31, path32, path33, path34, path35, path36, path37, path38, path39, path40, path41, path42, path43, path44, path45, path46, path47, path48, path49, path50, path51, path52, path53, path54, path55, path56, path57, path58, path59, path60, path61, path62, path63, path64, path65, path66, path67, path68, path69, path70, path71, path72, path73, path74, path75, path76, defs, clipPath, rect, t0, p, t1, br, t2, span;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g = svg_element("g");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			path4 = svg_element("path");
    			path5 = svg_element("path");
    			path6 = svg_element("path");
    			path7 = svg_element("path");
    			path8 = svg_element("path");
    			path9 = svg_element("path");
    			path10 = svg_element("path");
    			path11 = svg_element("path");
    			path12 = svg_element("path");
    			path13 = svg_element("path");
    			path14 = svg_element("path");
    			path15 = svg_element("path");
    			path16 = svg_element("path");
    			path17 = svg_element("path");
    			path18 = svg_element("path");
    			path19 = svg_element("path");
    			path20 = svg_element("path");
    			path21 = svg_element("path");
    			path22 = svg_element("path");
    			path23 = svg_element("path");
    			path24 = svg_element("path");
    			path25 = svg_element("path");
    			path26 = svg_element("path");
    			path27 = svg_element("path");
    			path28 = svg_element("path");
    			path29 = svg_element("path");
    			path30 = svg_element("path");
    			path31 = svg_element("path");
    			path32 = svg_element("path");
    			path33 = svg_element("path");
    			path34 = svg_element("path");
    			path35 = svg_element("path");
    			path36 = svg_element("path");
    			path37 = svg_element("path");
    			path38 = svg_element("path");
    			path39 = svg_element("path");
    			path40 = svg_element("path");
    			path41 = svg_element("path");
    			path42 = svg_element("path");
    			path43 = svg_element("path");
    			path44 = svg_element("path");
    			path45 = svg_element("path");
    			path46 = svg_element("path");
    			path47 = svg_element("path");
    			path48 = svg_element("path");
    			path49 = svg_element("path");
    			path50 = svg_element("path");
    			path51 = svg_element("path");
    			path52 = svg_element("path");
    			path53 = svg_element("path");
    			path54 = svg_element("path");
    			path55 = svg_element("path");
    			path56 = svg_element("path");
    			path57 = svg_element("path");
    			path58 = svg_element("path");
    			path59 = svg_element("path");
    			path60 = svg_element("path");
    			path61 = svg_element("path");
    			path62 = svg_element("path");
    			path63 = svg_element("path");
    			path64 = svg_element("path");
    			path65 = svg_element("path");
    			path66 = svg_element("path");
    			path67 = svg_element("path");
    			path68 = svg_element("path");
    			path69 = svg_element("path");
    			path70 = svg_element("path");
    			path71 = svg_element("path");
    			path72 = svg_element("path");
    			path73 = svg_element("path");
    			path74 = svg_element("path");
    			path75 = svg_element("path");
    			path76 = svg_element("path");
    			defs = svg_element("defs");
    			clipPath = svg_element("clipPath");
    			rect = svg_element("rect");
    			t0 = space();
    			p = element("p");
    			t1 = text("Всероссийская\n        ");
    			br = element("br");
    			t2 = text("\n        перепись\n        ");
    			span = element("span");
    			span.textContent = "населения";
    			attr_dev(path0, "d", "M33.3831 53.2063V81.2149C31.2807 80.8033 29.2379 80.2365 27.2647 79.5233C26.1211 79.1116 25.0015 78.6512\n            23.9073 78.1444C23.5349 77.9717 23.1639 77.7928 22.796 77.607C21.8512 77.1353 20.9279 76.6279 20.0268\n            76.0874C15.5124 73.3866 11.5623 69.8588 8.38786 65.7173C6.48244 63.2305 4.85818 60.5228 3.56067\n            57.6375V53.2063C3.56067 48.0657 7.09415 43.7396 11.8928 42.4727C12.0689 42.4258 12.2449 42.382 12.4248\n            42.3457C12.9003 42.2419 13.3898 42.1712 13.8882 42.1311C14.1915 42.108 14.498 42.0942 14.8076\n            42.0942H22.1336C22.9517 42.0942 23.7496 42.1799 24.519 42.3457C24.5627 42.3539 24.607 42.3639 24.6507\n            42.3739C24.7799 42.4027 24.9103 42.4339 25.037 42.4677C25.0408 42.4696 25.044 42.4696 25.0471\n            42.4709C26.3142 42.8056 27.4914 43.353 28.5401 44.0724C31.4669 46.0788 33.3831 49.4208 33.3831 53.2063Z");
    			attr_dev(path0, "fill", "#2BA1CF");
    			add_location(path0, file$8, 197, 10, 3586);
    			attr_dev(path1, "d", "M33.3832 53.2063V81.2149C31.2808 80.8033 29.238 80.2365 27.2648 79.5233C26.1212 79.1116 25.0016 78.6512\n            23.9074 78.1444C23.535 77.9717 23.164 77.7928 22.796 77.607C21.8513 77.1353 20.928 76.6279 20.0269\n            76.0874C15.5125 73.3866 11.5624 69.8588 8.38794 65.7173V53.2063C8.38794 48.0657 11.9214 43.7396 16.7201\n            42.4727C16.8968 42.4258 17.0728 42.382 17.252 42.3457C17.7282 42.2419 18.2177 42.1712 18.7154\n            42.1311C19.0188 42.108 19.3253 42.0942 19.6355 42.0942H22.1337C22.9518 42.0942 23.7497 42.1799 24.5191\n            42.3457C24.5628 42.3539 24.6071 42.3639 24.6508 42.3739C24.78 42.4027 24.9104 42.4339 25.0371\n            42.4677C25.0409 42.4696 25.044 42.4696 25.0472 42.4709C26.3143 42.8056 27.4915 43.353 28.5402 44.0724C31.467\n            46.0788 33.3832 49.4208 33.3832 53.2063Z");
    			attr_dev(path1, "fill", "#66BAED");
    			add_location(path1, file$8, 207, 10, 4532);
    			attr_dev(path2, "d", "M25.0751 42.3452L25.0485 42.471L21.6834 57.9329C21.3605 59.4187 20.037 60.496 18.4995 60.4973C18.49\n            60.4973 18.4811 60.4973 18.4723 60.4973C18.4621 60.4973 18.4526 60.4973 18.4425 60.4973C16.9044 60.496\n            15.5815 59.4187 15.2586 57.9329L11.8935 42.4722L11.8669 42.3452H25.0751Z");
    			attr_dev(path2, "fill", "#F2F0EC");
    			add_location(path2, file$8, 217, 10, 5426);
    			attr_dev(path3, "d", "M18.471 46.6438L13.407 49.424L11.8669 42.3452L15.0135 40.5146");
    			attr_dev(path3, "fill", "#D8D5D0");
    			add_location(path3, file$8, 222, 10, 5788);
    			attr_dev(path4, "d", "M18.4709 46.6438L23.535 49.424L25.075 42.3452L21.9284 40.5146");
    			attr_dev(path4, "fill", "#D8D5D0");
    			add_location(path4, file$8, 223, 10, 5888);
    			attr_dev(path5, "d", "M3.35181 39.4161V22.6572C3.35181 20.9543 3.6393 19.2858 4.20668 17.698C6.32993 11.7297 12.0627 7.71826\n            18.4717 7.71826C19.2658 7.71826 20.0579 7.77895 20.828 7.89906C24.3488 8.44272 27.5796 10.2182 29.9219\n            12.8989C32.289 15.6085 33.5928 19.0737 33.5928 22.6572V39.4161");
    			attr_dev(path5, "fill", "#CC7A3B");
    			add_location(path5, file$8, 224, 10, 5988);
    			attr_dev(path6, "d", "M9.57139 23.3116C9.57139 29.2392 13.0852 36.0972 15.0147 39.416H3.35107V22.6572C3.35107 20.9549 3.6392\n            19.2864 4.20595 17.698C6.31654 11.7641 11.9967 7.76453 18.3614 7.71948C13.7128 7.83397 9.57139 15.2024\n            9.57139 23.3116Z");
    			attr_dev(path6, "fill", "#A35418");
    			add_location(path6, file$8, 229, 10, 6343);
    			attr_dev(path7, "d", "M22.485 37.8137V42.6797C22.485 44.4608 21.2964 45.9667 19.6589 46.4665C19.284 46.5816 18.8844 46.6436\n            18.4716 46.6436C16.2552 46.6436 14.4594 44.8694 14.4594 42.6797V37.8137H22.485Z");
    			attr_dev(path7, "fill", "#EAB599");
    			add_location(path7, file$8, 234, 10, 6652);
    			attr_dev(path8, "d", "M22.485 42.3713V42.6798C22.485 44.4609 21.2964 45.9667 19.6588 46.4666C18.1815 46.018 17.0708 44.7487\n            16.8656 43.1959C17.1335 43.2122 17.4032 43.2203 17.6736 43.2203C18.4329 43.2203 19.1776 43.1609 19.902\n            43.0432C20.7955 42.9012 21.6592 42.6741 22.485 42.3713Z");
    			attr_dev(path8, "fill", "#F6CAAE");
    			add_location(path8, file$8, 238, 10, 6908);
    			attr_dev(path9, "d", "M7.464 29.8398C7.464 31.6753 6.10696 33.1974 4.32946 33.4796C4.13569 33.5109 3.93559 33.5271 3.73168\n            33.5271C1.67049 33.5271 0 31.8768 0 29.8398C0 27.8034 1.67049 26.1531 3.73168 26.1531C3.93559 26.1531\n            4.13569 26.1693 4.32946 26.2006C6.10696 26.4828 7.464 28.0043 7.464 29.8398Z");
    			attr_dev(path9, "fill", "#F6CAAE");
    			add_location(path9, file$8, 243, 10, 7255);
    			attr_dev(path10, "d", "M7.46396 29.8399C7.46396 31.6754 6.10693 33.1975 4.32942 33.4797C4.0071 32.3204 3.83423 31.0998 3.83423\n            29.8399C3.83423 28.5805 4.0071 27.3599 4.32942 26.2007C6.10693 26.4828 7.46396 28.0043 7.46396 29.8399Z");
    			attr_dev(path10, "fill", "#EAB599");
    			add_location(path10, file$8, 248, 10, 7621);
    			attr_dev(path11, "d", "M5.06591 29.8398C5.06591 30.568 4.46877 31.1579 3.73167 31.1579C2.99522 31.1579 2.39807 30.568 2.39807\n            29.8398C2.39807 29.1122 2.99522 28.5222 3.73167 28.5222C4.46877 28.5222 5.06591 29.1122 5.06591 29.8398Z");
    			attr_dev(path11, "fill", "#EAB599");
    			add_location(path11, file$8, 252, 10, 7903);
    			attr_dev(path12, "d", "M28.0544 25.132V37.8056C26.0717 39.6755 23.5293 40.9706 20.7006 41.421C20.6784 41.4247 20.6544 41.4285\n            20.6322 41.4323C19.9293 41.543 19.208 41.598 18.4716 41.598C10.8037 41.598 4.58716 35.4564 4.58716\n            27.8809V22.6571C4.58716 21.9883 4.63528 21.3301 4.729 20.687C8.03262 23.0343 12.7692 22.8022 15.7873\n            19.9845C16.7865 19.0517 17.4812 17.9412 17.8738 16.7632C18.0923 18.8258 19.0472 20.8334 20.7398\n            22.4143C22.7548 24.2937 25.4169 25.2002 28.0544 25.132Z");
    			attr_dev(path12, "fill", "#EAB599");
    			add_location(path12, file$8, 256, 10, 8185);
    			attr_dev(path13, "d", "M28.0545 25.132V37.8056C26.0718 39.6755 23.5294 40.9706 20.7007 41.421C20.6785 41.4247 20.6544 41.4285\n            20.6323 41.4323C13.9909 40.4069 8.91101 34.7288 8.91101 27.8809V22.6571C8.91101 22.5182 8.91354 22.3799\n            8.91861 22.2423C11.3667 22.49 13.9098 21.738 15.7874 19.9838C16.7866 19.0517 17.4813 17.9406 17.8739\n            16.7632C18.0924 18.8258 19.0473 20.8334 20.7399 22.4143C22.7549 24.2937 25.417 25.2002 28.0545 25.132Z");
    			attr_dev(path13, "fill", "#F6CAAE");
    			add_location(path13, file$8, 263, 10, 8750);
    			attr_dev(path14, "d", "M25.9293 26.7223C25.9293 25.4636 24.8965 24.4438 23.623 24.4438C22.3496 24.4438 21.3168 25.4636 21.3168\n            26.7223");
    			attr_dev(path14, "fill", "#EAB599");
    			add_location(path14, file$8, 269, 10, 9259);
    			attr_dev(path15, "d", "M15.6291 26.7223C15.6291 25.4636 14.5963 24.4438 13.3228 24.4438C12.0494 24.4438 11.0172 25.4636 11.0172\n            26.7223");
    			attr_dev(path15, "fill", "#EAB599");
    			add_location(path15, file$8, 273, 10, 9445);
    			attr_dev(path16, "d", "M14.8983 27.6921C14.8983 28.5517 14.1929 29.2486 13.3228 29.2486C12.4527 29.2486 11.7479 28.5517 11.7479\n            27.6921C11.7479 26.8325 12.4527 26.1362 13.3228 26.1362C14.1929 26.1362 14.8983 26.8325 14.8983 27.6921Z");
    			attr_dev(path16, "fill", "#3D4159");
    			add_location(path16, file$8, 277, 10, 9632);
    			attr_dev(path17, "d", "M25.1978 27.6921C25.1978 28.5517 24.493 29.2486 23.623 29.2486C22.7529 29.2486 22.0481 28.5517 22.0481\n            27.6921C22.0481 26.8325 22.7529 26.1362 23.623 26.1362C24.493 26.1362 25.1978 26.8325 25.1978 27.6921Z");
    			attr_dev(path17, "fill", "#3D4159");
    			add_location(path17, file$8, 281, 10, 9916);
    			attr_dev(path18, "d", "M20.0483 31.6101H16.898C16.5225 31.6101 16.2185 31.3092 16.2185 30.9389C16.2185 30.5685 16.5225 30.2676\n            16.898 30.2676H20.0483C20.4232 30.2676 20.7272 30.5685 20.7272 30.9389C20.7272 31.3092 20.4232 31.6101\n            20.0483 31.6101Z");
    			attr_dev(path18, "fill", "#EAB599");
    			add_location(path18, file$8, 285, 10, 10196);
    			attr_dev(path19, "d", "M18.4729 35.8575C17.3103 35.8575 16.1476 35.5697 15.0876 34.9935C14.7887 34.8315 14.6798 34.4605 14.8438\n            34.1652C15.0084 33.8699 15.3839 33.7623 15.6828 33.9243C17.4299 34.8734 19.5158 34.8734 21.2629\n            33.9243C21.5618 33.7617 21.9374 33.8699 22.102 34.1652C22.266 34.4605 22.1571 34.8315 21.8582\n            34.9935C20.7982 35.5697 19.6355 35.8575 18.4729 35.8575Z");
    			attr_dev(path19, "fill", "#EAB599");
    			add_location(path19, file$8, 290, 10, 10506);
    			attr_dev(path20, "d", "M14.5772 27.4174C14.5772 27.7859 14.2746 28.0843 13.9022 28.0843C13.5292 28.0843 13.2272 27.7859 13.2272\n            27.4174C13.2272 27.0489 13.5292 26.7505 13.9022 26.7505C14.2746 26.7505 14.5772 27.0489 14.5772 27.4174Z");
    			attr_dev(path20, "fill", "white");
    			add_location(path20, file$8, 296, 10, 10956);
    			attr_dev(path21, "d", "M24.954 27.4174C24.954 27.7859 24.652 28.0843 24.2796 28.0843C23.9067 28.0843 23.6046 27.7859 23.6046\n            27.4174C23.6046 27.0489 23.9067 26.7505 24.2796 26.7505C24.652 26.7505 24.954 27.0489 24.954 27.4174Z");
    			attr_dev(path21, "fill", "white");
    			add_location(path21, file$8, 300, 10, 11238);
    			attr_dev(path22, "d", "M27.9234 31.4826C27.9234 32.426 27.1489 33.1911 26.1934 33.1911C25.2384 33.1911 24.464 32.426 24.464\n            31.4826C24.464 30.5386 25.2384 29.7734 26.1934 29.7734C27.1489 29.7734 27.9234 30.5386 27.9234 31.4826Z");
    			attr_dev(path22, "fill", "#EAB599");
    			add_location(path22, file$8, 304, 10, 11514);
    			attr_dev(path23, "d", "M12.4805 31.4826C12.4805 32.426 11.7067 33.1911 10.7511 33.1911C9.79618 33.1911 9.02173 32.426 9.02173\n            31.4826C9.02173 30.5386 9.79618 29.7734 10.7511 29.7734C11.7067 29.7734 12.4805 30.5386 12.4805 31.4826Z");
    			attr_dev(path23, "fill", "#EAB599");
    			add_location(path23, file$8, 308, 10, 11793);
    			attr_dev(path24, "d", "M79.2754 52.8685V58.001C75.1865 66.8552 68.0024 74.0191 59.0908 78.1463C57.4767 78.8926 55.805 79.5401\n            54.0838 80.0788C52.148 80.69 50.1508 81.1598 48.101 81.4826C48.0927 81.4845 48.0826 81.4864 48.0737\n            81.4864V52.8685C48.0737 46.7688 52.8287 41.7645 58.8793 41.2828C59.1979 41.2559 59.5176 41.2446 59.8412\n            41.2446H67.5047C68.4109 41.2446 69.293 41.3428 70.1402 41.5355C75.3708 42.7167 79.2754 47.3443 79.2754\n            52.8685Z");
    			attr_dev(path24, "fill", "#BFD5DE");
    			add_location(path24, file$8, 312, 10, 12075);
    			attr_dev(path25, "d", "M79.2753 52.8685V58.001C75.1865 66.8552 68.0023 74.0191 59.0908 78.1463C57.4766 78.8926 55.8049 79.5401\n            54.0837 80.0788V52.8685C54.0837 46.4491 59.3536 41.2446 65.8531 41.2446H67.5059C74.0074 41.2446 79.2753\n            46.4491 79.2753 52.8685Z");
    			attr_dev(path25, "fill", "#DDE8ED");
    			add_location(path25, file$8, 319, 10, 12604);
    			attr_dev(path26, "d", "M52.1562 28.4222C52.1562 30.3428 50.7364 31.935 48.8772 32.2303C48.674 32.2628 48.465 32.2797 48.2516\n            32.2797C46.0948 32.2797 44.347 30.553 44.347 28.4222C44.347 26.2914 46.0948 24.5647 48.2516 24.5647C48.465\n            24.5647 48.674 24.5816 48.8772 24.6141C50.7364 24.91 52.1562 26.5022 52.1562 28.4222Z");
    			attr_dev(path26, "fill", "#D3A489");
    			add_location(path26, file$8, 324, 10, 12923);
    			attr_dev(path27, "d", "M66.8334 45.4382L63.6741 50.4444L60.5149 45.4382");
    			attr_dev(path27, "fill", "#F74F4F");
    			add_location(path27, file$8, 329, 10, 13304);
    			attr_dev(path28, "d", "M67.9245 64.5857L63.6742 69.8846L59.4232 64.5857L63.6748 49.1418L67.9245 64.5857Z");
    			attr_dev(path28, "fill", "#F74F4F");
    			add_location(path28, file$8, 330, 10, 13391);
    			attr_dev(path29, "d", "M52.1562 28.4221C52.1562 30.3427 50.7364 31.9349 48.8772 32.2302C48.5397 31.0171 48.3593 29.7403 48.3593\n            28.4221C48.3593 27.1046 48.5397 25.8277 48.8772 24.614C50.7364 24.9099 52.1562 26.5021 52.1562 28.4221Z");
    			attr_dev(path29, "fill", "#BF8E75");
    			add_location(path29, file$8, 331, 10, 13511);
    			attr_dev(path30, "d", "M49.6473 28.4222C49.6473 29.1835 49.0222 29.801 48.2516 29.801C47.4809 29.801 46.8566 29.1835 46.8566\n            28.4222C46.8566 27.6608 47.4809 27.0439 48.2516 27.0439C49.0222 27.0439 49.6473 27.6608 49.6473 28.4222Z");
    			attr_dev(path30, "fill", "#BF8E75");
    			add_location(path30, file$8, 335, 10, 13794);
    			attr_dev(path31, "d", "M63.6728 46.003L58.3751 48.9121L56.7635 41.5055L60.0551 39.5898");
    			attr_dev(path31, "fill", "#BFD5DE");
    			add_location(path31, file$8, 339, 10, 14075);
    			attr_dev(path32, "d", "M63.6729 46.003L68.9712 48.9121L70.5828 41.5055L67.2905 39.5898");
    			attr_dev(path32, "fill", "#BFD5DE");
    			add_location(path32, file$8, 340, 10, 14177);
    			attr_dev(path33, "d", "M75.1909 28.4222C75.1909 30.3428 76.6106 31.935 78.4698 32.2303C78.6731 32.2628 78.8821 32.2797 79.0955\n            32.2797C81.2523 32.2797 83 30.553 83 28.4222C83 26.2914 81.2523 24.5647 79.0955 24.5647C78.8821 24.5647\n            78.6731 24.5816 78.4698 24.6141C76.6106 24.91 75.1909 26.5022 75.1909 28.4222Z");
    			attr_dev(path33, "fill", "#D3A489");
    			add_location(path33, file$8, 341, 10, 14279);
    			attr_dev(path34, "d", "M75.1909 28.4221C75.1909 30.3427 76.6106 31.9349 78.4698 32.2302C78.808 31.0171 78.9878 29.7403 78.9878\n            28.4221C78.9878 27.1046 78.808 25.8277 78.4698 24.614C76.6106 24.9099 75.1909 26.5021 75.1909 28.4221Z");
    			attr_dev(path34, "fill", "#BF8E75");
    			add_location(path34, file$8, 346, 10, 14652);
    			attr_dev(path35, "d", "M80.491 28.4222C80.491 29.1835 79.866 29.801 79.0954 29.801C78.3247 29.801 77.6997 29.1835 77.6997\n            28.4222C77.6997 27.6608 78.3247 27.0439 79.0954 27.0439C79.866 27.0439 80.491 27.6608 80.491 28.4222Z");
    			attr_dev(path35, "fill", "#BF8E75");
    			add_location(path35, file$8, 350, 10, 14933);
    			attr_dev(path36, "d", "M78.2013 26.3721C78.2013 33.514 72.9201 39.4392 66.0051 40.539C65.2471 40.6622 64.4682 40.7242 63.6735\n            40.7242C55.6497 40.7242 49.1464 34.2992 49.1464 26.3721C49.1464 22.6215 50.4648 16.991 52.8489\n            14.4342C55.5035 11.587 59.446 12.0193 63.6735 12.0193C64.4682 12.0193 65.2465 12.0819 66.0051\n            12.2051C72.9201 13.3049 78.2013 19.2295 78.2013 26.3721Z");
    			attr_dev(path36, "fill", "#BF8E75");
    			add_location(path36, file$8, 354, 10, 15208);
    			attr_dev(path37, "d", "M67.8725 36.7654V41.856C67.8725 43.7197 66.6288 45.295 64.9153 45.818C64.5233 45.9381 64.1053 46.0032\n            63.6728 46.0032C61.3546 46.0032 59.4751 44.1463 59.4751 41.856V36.7654H67.8725Z");
    			attr_dev(path37, "fill", "#BF8E75");
    			add_location(path37, file$8, 360, 10, 15655);
    			attr_dev(path38, "d", "M67.8726 41.533V41.8558C67.8726 43.7195 66.6289 45.2948 64.9153 45.8178C63.3696 45.3486 62.2076 44.0204\n            61.9929 42.3957C62.2734 42.4126 62.5552 42.4213 62.8389 42.4213C63.633 42.4213 64.4119 42.3588 65.1705\n            42.2361C66.1052 42.0873 67.0082 41.8501 67.8726 41.533Z");
    			attr_dev(path38, "fill", "#D3A489");
    			add_location(path38, file$8, 364, 10, 15911);
    			attr_dev(path39, "d", "M78.2013 26.3719C78.2013 33.5139 72.9201 39.439 66.0051 40.5389C59.0908 39.439 53.8096 33.5139 53.8096\n            26.3719C53.8096 21.9739 55.8119 18.0375 58.966 15.4043C60.9329 13.7615 63.3487 12.6273 66.0051\n            12.2043C72.4515 13.2297 77.4801 18.4504 78.1298 24.9405C78.1773 25.4116 78.2013 25.8896 78.2013 26.3719Z");
    			attr_dev(path39, "fill", "#D3A489");
    			add_location(path39, file$8, 369, 10, 16260);
    			attr_dev(path40, "d", "M63.6742 33.4407C62.4571 33.4407 61.2413 33.1397 60.1325 32.5373C59.819 32.3677 59.705 31.9792 59.8773\n            31.6702C60.0489 31.3611 60.4421 31.2485 60.7549 31.4187C62.5825 32.4109 64.7653 32.4109 66.5934\n            31.4187C66.9056 31.2485 67.2989 31.3611 67.4705 31.6702C67.6427 31.9792 67.5287 32.3677 67.2159\n            32.5373C66.1071 33.1397 64.89 33.4407 63.6742 33.4407Z");
    			attr_dev(path40, "fill", "#BF8E75");
    			add_location(path40, file$8, 374, 10, 16649);
    			attr_dev(path41, "d", "M60.5801 25.5367C60.5801 26.4357 59.8423 27.1645 58.9317 27.1645C58.0218 27.1645 57.2841 26.4357 57.2841\n            25.5367C57.2841 24.637 58.0218 23.9082 58.9317 23.9082C59.8423 23.9082 60.5801 24.637 60.5801 25.5367Z");
    			attr_dev(path41, "fill", "#3D4159");
    			add_location(path41, file$8, 380, 10, 17097);
    			attr_dev(path42, "d", "M70.0635 25.5367C70.0635 26.4357 69.3257 27.1645 68.4158 27.1645C67.5052 27.1645 66.7675 26.4357 66.7675\n            25.5367C66.7675 24.637 67.5052 23.9082 68.4158 23.9082C69.3257 23.9082 70.0635 24.637 70.0635 25.5367Z");
    			attr_dev(path42, "fill", "#3D4159");
    			add_location(path42, file$8, 384, 10, 17379);
    			attr_dev(path43, "d", "M60.2439 25.2491C60.2439 25.6344 59.9279 25.9473 59.5378 25.9473C59.1478 25.9473 58.8318 25.6344 58.8318\n            25.2491C58.8318 24.8643 59.1478 24.5515 59.5378 24.5515C59.9279 24.5515 60.2439 24.8643 60.2439 25.2491Z");
    			attr_dev(path43, "fill", "white");
    			add_location(path43, file$8, 388, 10, 17661);
    			attr_dev(path44, "d", "M69.8084 25.2491C69.8084 25.6344 69.4924 25.9473 69.1023 25.9473C68.7122 25.9473 68.3962 25.6344 68.3962\n            25.2491C68.3962 24.8643 68.7122 24.5515 69.1023 24.5515C69.4924 24.5515 69.8084 24.8643 69.8084 25.2491Z");
    			attr_dev(path44, "fill", "white");
    			add_location(path44, file$8, 392, 10, 17943);
    			attr_dev(path45, "d", "M65.3218 29.6359H62.0258C61.6332 29.6359 61.3147 29.3213 61.3147 28.9334C61.3147 28.5455 61.6332 28.2314\n            62.0258 28.2314H65.3218C65.7144 28.2314 66.033 28.5455 66.033 28.9334C66.0323 29.3213 65.7144 29.6359\n            65.3218 29.6359Z");
    			attr_dev(path45, "fill", "#BF8E75");
    			add_location(path45, file$8, 396, 10, 18225);
    			attr_dev(path46, "d", "M68.457 52.4873H74.7901V54.4023H68.457V52.4873Z");
    			attr_dev(path46, "fill", "#BFD5DE");
    			add_location(path46, file$8, 401, 10, 18535);
    			attr_dev(path47, "d", "M62.8237 7.91956C67.2247 8.22986 70.7582 11.742 70.9818 16.1632L71.0236 16.9934H73.5552L74.9186\n            25.9509L78.221 24.9412L77.7777 16.1639C77.5434 11.5193 73.6553 7.87952 68.9503 7.89704L62.8237 7.91956Z");
    			attr_dev(path47, "fill", "#2A2F4F");
    			add_location(path47, file$8, 402, 10, 18621);
    			attr_dev(path48, "d", "M77.4978 4.45508C81.0021 7.91721 81.0021 13.5308 77.4978 16.9929C73.9934 20.4551 68.3114 20.4551 64.807\n            16.9929L77.4978 4.45508Z");
    			attr_dev(path48, "fill", "#3D4159");
    			add_location(path48, file$8, 406, 10, 18895);
    			attr_dev(path49, "d", "M64.8071 16.9927H53.7938L52.4298 25.9508L49.1274 24.9411L49.5701 16.1631C49.8044 11.5198 53.6925 7.87879\n            58.3981 7.8963L74.3044 7.95574L76.4074 11.695");
    			attr_dev(path49, "fill", "#3D4159");
    			add_location(path49, file$8, 410, 10, 19098);
    			attr_dev(path50, "d", "M64.5239 7.91956C60.1229 8.22986 56.5894 11.742 56.3659 16.1632L56.3241 16.9934H53.7931L52.4291\n            25.9509L49.1267 24.9412L49.57 16.1639C49.8043 11.5193 53.6924 7.87952 58.3973 7.89704L64.5239 7.91956Z");
    			attr_dev(path50, "fill", "#2A2F4F");
    			add_location(path50, file$8, 414, 10, 19323);
    			attr_dev(path51, "d", "M59.0907 75.072V78.1462C53.7499 80.618 47.7892 82 41.4999 82C35.2106 82 29.248 80.618 23.9072\n            78.1443V75.072C23.9072 69.0054 28.0758 63.9029 33.7383 62.4071C33.9453 62.3521 34.1537 62.3014 34.3652\n            62.2563C34.9275 62.1356 35.505 62.0524 36.0914 62.0055C36.4504 61.9767 36.8114 61.9617 37.1774\n            61.9617H45.8192C46.7862 61.9617 47.7265 62.0624 48.6346 62.2563C48.6872 62.2663 48.7397 62.2782 48.7904\n            62.2901C48.943 62.3251 49.095 62.3621 49.2457 62.4021C49.2514 62.4034 49.2526 62.4034 49.2577\n            62.4052C50.7522 62.8 52.1428 63.4462 53.3776 64.2946C56.8313 66.6613 59.0907 70.6051 59.0907 75.072Z");
    			attr_dev(path51, "fill", "#3D4159");
    			add_location(path51, file$8, 418, 10, 19596);
    			attr_dev(path52, "d", "M49.2902 62.2563L49.2579 62.4052L45.0253 81.853C44.8062 81.8711 44.5865 81.888 44.3661 81.903C44.0558\n            81.923 43.7443 81.9412 43.4308 81.9549C42.7906 81.985 42.1472 82 41.5001 82C40.8358 82 40.1772 81.985\n            39.5218 81.9531C39.2255 81.9399 38.9285 81.923 38.6321 81.9011C38.4105 81.8861 38.1901 81.8711 37.9698\n            81.853L33.7384 62.4071L33.7068 62.2563H49.2902Z");
    			attr_dev(path52, "fill", "#66BAED");
    			add_location(path52, file$8, 426, 10, 20309);
    			attr_dev(path53, "d", "M45.0614 66.6926L41.4987 72.3369L37.9368 66.6926");
    			attr_dev(path53, "fill", "#3D4159");
    			add_location(path53, file$8, 432, 10, 20762);
    			attr_dev(path54, "d", "M44.3661 81.9031C44.0558 81.9231 43.7442 81.9412 43.4308 81.955C42.7906 81.985 42.1472 82 41.5 82C40.8358\n            82 40.1772 81.985 39.5218 81.9531C39.2254 81.94 38.9284 81.9231 38.6321 81.9012L41.5 70.8679L44.3661\n            81.9031Z");
    			attr_dev(path54, "fill", "#3D4159");
    			add_location(path54, file$8, 433, 10, 20849);
    			attr_dev(path55, "d", "M41.4981 67.3288L35.5235 70.6089L33.7061 62.2576L37.4181 60.0974");
    			attr_dev(path55, "fill", "#2BA1CF");
    			add_location(path55, file$8, 438, 10, 21151);
    			attr_dev(path56, "d", "M41.4982 67.3288L47.4722 70.6089L49.2896 62.2576L45.5775 60.0974");
    			attr_dev(path56, "fill", "#2BA1CF");
    			add_location(path56, file$8, 439, 10, 21254);
    			attr_dev(path57, "d", "M49.5156 73.5273H51.4109L48.1009 81.4826C46.5698 81.7253 45.0114 81.8843 43.4308 81.9549L49.2458\n            62.4021L49.2902 62.2563L53.3777 63.5751L49.5156 73.5273Z");
    			attr_dev(path57, "fill", "#2A2F4F");
    			add_location(path57, file$8, 440, 10, 21357);
    			attr_dev(path58, "d", "M39.5218 81.9531C37.9393 81.8811 36.3797 81.7191 34.8485 81.4745L31.5417 73.5273H33.437L29.5736\n            63.5751L33.6624 62.2563L33.7068 62.4021L39.5218 81.9531Z");
    			attr_dev(path58, "fill", "#2A2F4F");
    			add_location(path58, file$8, 444, 10, 21585);
    			attr_dev(path59, "d", "M46.2335 56.9116V62.6516C46.2335 64.7536 44.8309 66.5298 42.8989 67.1197C42.4562 67.2555 41.9851 67.3287\n            41.4975 67.3287C38.8829 67.3287 36.764 65.2347 36.764 62.6516V56.9116H46.2335Z");
    			attr_dev(path59, "fill", "#EAB599");
    			add_location(path59, file$8, 448, 10, 21812);
    			attr_dev(path60, "d", "M46.2334 62.2883V62.6524C46.2334 64.7539 44.8308 66.53 42.8988 67.1205C41.1555 66.5907 39.8447 65.0936\n            39.6028 63.2612C39.9194 63.2805 40.2373 63.2899 40.5564 63.2899C41.4525 63.2899 42.3308 63.2199 43.1857\n            63.0816C44.24 62.9139 45.2582 62.6456 46.2334 62.2883Z");
    			attr_dev(path60, "fill", "#F6CAAE");
    			add_location(path60, file$8, 452, 10, 22070);
    			attr_dev(path61, "d", "M28.5111 47.5038C28.5111 49.6691 26.9096 51.4646 24.8129 51.798C24.5837 51.8343 24.3481 51.8537 24.1081\n            51.8537C21.6759 51.8537 19.7046 49.9068 19.7046 47.5038C19.7046 45.1008 21.6752 43.1533 24.1081\n            43.1533C24.3481 43.1533 24.5837 43.1727 24.8129 43.2096C26.9096 43.5431 28.5111 45.3386 28.5111 47.5038Z");
    			attr_dev(path61, "fill", "#F6CAAE");
    			add_location(path61, file$8, 457, 10, 22418);
    			attr_dev(path62, "d", "M28.5111 47.5039C28.5111 49.6691 26.9096 51.4646 24.813 51.7981C24.4324 50.4299 24.2291 48.9897 24.2291\n            47.5039C24.2291 46.0175 24.4324 44.5779 24.813 43.2097C26.9096 43.5432 28.5111 45.3387 28.5111 47.5039Z");
    			attr_dev(path62, "fill", "#EAB599");
    			add_location(path62, file$8, 462, 10, 22809);
    			attr_dev(path63, "d", "M25.6816 47.5039C25.6816 48.3622 24.9768 49.0585 24.108 49.0585C23.2386 49.0585 22.5344 48.3622 22.5344\n            47.5039C22.5344 46.6449 23.2386 45.9492 24.108 45.9492C24.9768 45.9492 25.6816 46.6449 25.6816 47.5039Z");
    			attr_dev(path63, "fill", "#EAB599");
    			add_location(path63, file$8, 466, 10, 23091);
    			attr_dev(path64, "d", "M54.4858 47.5038C54.4858 49.6691 56.0873 51.4646 58.184 51.798C58.4126 51.8343 58.6488 51.8537 58.8888\n            51.8537C61.321 51.8537 63.2923 49.9068 63.2923 47.5038C63.2923 45.1008 61.3217 43.1533 58.8888\n            43.1533C58.6488 43.1533 58.4126 43.1727 58.184 43.2096C56.0873 43.5431 54.4858 45.3386 54.4858 47.5038Z");
    			attr_dev(path64, "fill", "#F6CAAE");
    			add_location(path64, file$8, 470, 10, 23373);
    			attr_dev(path65, "d", "M54.4858 47.5039C54.4858 49.6691 56.0873 51.4646 58.184 51.7981C58.5645 50.4299 58.7678 48.9897 58.7678\n            47.5039C58.7678 46.0175 58.5645 44.5779 58.184 43.2097C56.0873 43.5432 54.4858 45.3387 54.4858 47.5039Z");
    			attr_dev(path65, "fill", "#EAB599");
    			add_location(path65, file$8, 475, 10, 23761);
    			attr_dev(path66, "d", "M57.8806 39.0294V45.1923C57.8806 53.2464 51.925 59.9273 44.1273 61.1672C44.1013 61.1716 44.0735 61.176\n            44.0475 61.1804C43.218 61.3118 42.3669 61.3762 41.4981 61.3762C32.451 61.3762 25.1174 54.1304 25.1174\n            45.1929V39.0294C25.1174 37.1476 25.4423 35.3389 26.0426 33.6585C28.283 27.3599 34.3577 22.8442 41.4981\n            22.8442H41.4993C42.3669 22.8442 43.2192 22.9106 44.05 23.0401C51.8857 24.2494 57.8806 30.9484 57.8806\n            39.0294Z");
    			attr_dev(path66, "fill", "#EAB599");
    			add_location(path66, file$8, 479, 10, 24043);
    			attr_dev(path67, "d", "M60.4624 47.5039C60.4624 48.3622 59.7582 49.0585 58.8888 49.0585C58.02 49.0585 57.3152 48.3622 57.3152\n            47.5039C57.3152 46.6449 58.02 45.9492 58.8888 45.9492C59.7582 45.9492 60.4624 46.6449 60.4624 47.5039Z");
    			attr_dev(path67, "fill", "#EAB599");
    			add_location(path67, file$8, 486, 10, 24572);
    			attr_dev(path68, "d", "M57.88 39.0294V45.1923C57.88 53.2458 51.925 59.9273 44.1273 61.1672C44.1007 61.1716 44.0734 61.176\n            44.0468 61.1804C36.2118 59.9704 30.2181 53.272 30.2181 45.1923V39.0294C30.2181 30.9484 36.213 24.2493 44.05\n            23.04C51.8857 24.2493 57.88 30.9484 57.88 39.0294Z");
    			attr_dev(path68, "fill", "#F6CAAE");
    			add_location(path68, file$8, 490, 10, 24852);
    			attr_dev(path69, "d", "M38.0096 44.2494C38.0096 45.2635 37.1775 46.0855 36.1516 46.0855C35.1252 46.0855 34.2931 45.2635 34.2931\n            44.2494C34.2931 43.2359 35.1252 42.4138 36.1516 42.4138C37.1775 42.4138 38.0096 43.2359 38.0096 44.2494Z");
    			attr_dev(path69, "fill", "#3D4159");
    			add_location(path69, file$8, 495, 10, 25196);
    			attr_dev(path70, "d", "M48.7043 44.2494C48.7043 45.2635 47.8722 46.0855 46.8457 46.0855C45.8193 46.0855 44.9872 45.2635 44.9872\n            44.2494C44.9872 43.2359 45.8193 42.4138 46.8457 42.4138C47.8722 42.4138 48.7043 43.2359 48.7043 44.2494Z");
    			attr_dev(path70, "fill", "#3D4159");
    			add_location(path70, file$8, 499, 10, 25480);
    			attr_dev(path71, "d", "M37.6309 43.9259C37.6309 44.3601 37.2744 44.7123 36.8343 44.7123C36.3948 44.7123 36.0383 44.3601 36.0383\n            43.9259C36.0383 43.4911 36.3948 43.1389 36.8343 43.1389C37.2744 43.1389 37.6309 43.4911 37.6309 43.9259Z");
    			attr_dev(path71, "fill", "white");
    			add_location(path71, file$8, 503, 10, 25764);
    			attr_dev(path72, "d", "M48.4162 43.9259C48.4162 44.3601 48.0597 44.7123 47.6202 44.7123C47.1801 44.7123 46.8236 44.3601 46.8236\n            43.9259C46.8236 43.4911 47.1801 43.1389 47.6202 43.1389C48.0597 43.1389 48.4162 43.4911 48.4162 43.9259Z");
    			attr_dev(path72, "fill", "white");
    			add_location(path72, file$8, 507, 10, 26046);
    			attr_dev(path73, "d", "M43.3573 48.1526H39.6402C39.1975 48.1526 38.8385 47.7979 38.8385 47.3606C38.8385 46.9227 39.1975 46.5686\n            39.6402 46.5686H43.3573C43.7999 46.5686 44.159 46.9227 44.159 47.3606C44.1584 47.7979 43.7993 48.1526\n            43.3573 48.1526Z");
    			attr_dev(path73, "fill", "#EAB599");
    			add_location(path73, file$8, 511, 10, 26328);
    			attr_dev(path74, "d", "M41.4987 53.1631C40.1271 53.1631 38.7549 52.8234 37.5048 52.144C37.1521 51.9525 37.0229 51.5146 37.2173\n            51.1668C37.4111 50.8183 37.8544 50.6913 38.2071 50.8821C40.2683 52.0019 42.7291 52.0019 44.7903\n            50.8821C45.143 50.6907 45.5862 50.8177 45.78 51.1668C45.9744 51.5146 45.8452 51.9525 45.4925 52.144C44.2419\n            52.8234 42.8703 53.1631 41.4987 53.1631Z");
    			attr_dev(path74, "fill", "#EAB599");
    			add_location(path74, file$8, 516, 10, 26638);
    			attr_dev(path75, "d", "M57.8806 33.4364V39.7494H54.8316V34.8052L32.8227 30.765L28.1659 29.9098V39.7494H25.1168V33.4357C25.1168\n            26.2387 31.0211 20.4055 38.3047 20.4055H44.6928C44.8663 20.4055 45.0398 20.4086 45.2133 20.4174C52.2543\n            20.6852 57.8806 26.4108 57.8806 33.4364Z");
    			attr_dev(path75, "fill", "#2A2F4F");
    			add_location(path75, file$8, 522, 10, 27085);
    			attr_dev(path76, "d", "M57.8807 33.4364V39.7495H54.8316V34.8053L32.8228 30.7651C34.0354 25.0107 39.0887 20.6508 45.2134\n            20.4175C52.2543 20.6852 57.8807 26.4108 57.8807 33.4364Z");
    			attr_dev(path76, "fill", "#3D4159");
    			add_location(path76, file$8, 527, 10, 27420);
    			attr_dev(g, "clip-path", "url(#clip0)");
    			add_location(g, file$8, 196, 8, 3548);
    			attr_dev(rect, "width", "83");
    			attr_dev(rect, "height", "82");
    			attr_dev(rect, "fill", "white");
    			add_location(rect, file$8, 534, 12, 27710);
    			attr_dev(clipPath, "id", "clip0");
    			add_location(clipPath, file$8, 533, 10, 27676);
    			add_location(defs, file$8, 532, 8, 27659);
    			attr_dev(svg, "width", "83");
    			attr_dev(svg, "height", "82");
    			attr_dev(svg, "viewBox", "0 0 83 82");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file$8, 195, 6, 3444);
    			add_location(br, file$8, 540, 8, 27864);
    			attr_dev(span, "class", "pink");
    			add_location(span, file$8, 542, 8, 27896);
    			attr_dev(p, "class", "logo-text svelte-1xiab02");
    			add_location(p, file$8, 538, 6, 27812);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g);
    			append_dev(g, path0);
    			append_dev(g, path1);
    			append_dev(g, path2);
    			append_dev(g, path3);
    			append_dev(g, path4);
    			append_dev(g, path5);
    			append_dev(g, path6);
    			append_dev(g, path7);
    			append_dev(g, path8);
    			append_dev(g, path9);
    			append_dev(g, path10);
    			append_dev(g, path11);
    			append_dev(g, path12);
    			append_dev(g, path13);
    			append_dev(g, path14);
    			append_dev(g, path15);
    			append_dev(g, path16);
    			append_dev(g, path17);
    			append_dev(g, path18);
    			append_dev(g, path19);
    			append_dev(g, path20);
    			append_dev(g, path21);
    			append_dev(g, path22);
    			append_dev(g, path23);
    			append_dev(g, path24);
    			append_dev(g, path25);
    			append_dev(g, path26);
    			append_dev(g, path27);
    			append_dev(g, path28);
    			append_dev(g, path29);
    			append_dev(g, path30);
    			append_dev(g, path31);
    			append_dev(g, path32);
    			append_dev(g, path33);
    			append_dev(g, path34);
    			append_dev(g, path35);
    			append_dev(g, path36);
    			append_dev(g, path37);
    			append_dev(g, path38);
    			append_dev(g, path39);
    			append_dev(g, path40);
    			append_dev(g, path41);
    			append_dev(g, path42);
    			append_dev(g, path43);
    			append_dev(g, path44);
    			append_dev(g, path45);
    			append_dev(g, path46);
    			append_dev(g, path47);
    			append_dev(g, path48);
    			append_dev(g, path49);
    			append_dev(g, path50);
    			append_dev(g, path51);
    			append_dev(g, path52);
    			append_dev(g, path53);
    			append_dev(g, path54);
    			append_dev(g, path55);
    			append_dev(g, path56);
    			append_dev(g, path57);
    			append_dev(g, path58);
    			append_dev(g, path59);
    			append_dev(g, path60);
    			append_dev(g, path61);
    			append_dev(g, path62);
    			append_dev(g, path63);
    			append_dev(g, path64);
    			append_dev(g, path65);
    			append_dev(g, path66);
    			append_dev(g, path67);
    			append_dev(g, path68);
    			append_dev(g, path69);
    			append_dev(g, path70);
    			append_dev(g, path71);
    			append_dev(g, path72);
    			append_dev(g, path73);
    			append_dev(g, path74);
    			append_dev(g, path75);
    			append_dev(g, path76);
    			append_dev(svg, defs);
    			append_dev(defs, clipPath);
    			append_dev(clipPath, rect);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t1);
    			append_dev(p, br);
    			append_dev(p, t2);
    			append_dev(p, span);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(svg);
    				detach_dev(t0);
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_5.name, type: "slot", source: "(195:4) <Link to=\"/\">", ctx });
    	return block;
    }

    // (547:6) <Link to="/results">
    function create_default_slot_4(ctx) {
    	var svg, circle, t, span;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			circle = svg_element("circle");
    			t = space();
    			span = element("span");
    			span.textContent = "ИТОГИ ПЕРЕПИСИ";
    			attr_dev(circle, "cx", "5");
    			attr_dev(circle, "cy", "5");
    			attr_dev(circle, "r", "5");
    			attr_dev(circle, "fill", "#FF2929");
    			add_location(circle, file$8, 548, 10, 28121);
    			attr_dev(svg, "width", "10");
    			attr_dev(svg, "height", "10");
    			attr_dev(svg, "viewBox", "0 0 10 10");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file$8, 547, 8, 28015);
    			attr_dev(span, "class", "link svelte-1xiab02");
    			add_location(span, file$8, 550, 8, 28190);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, circle);
    			insert_dev(target, t, anchor);
    			insert_dev(target, span, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(svg);
    				detach_dev(t);
    				detach_dev(span);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_4.name, type: "slot", source: "(547:6) <Link to=\"/results\">", ctx });
    	return block;
    }

    // (553:6) <Link to="partners">
    function create_default_slot_3(ctx) {
    	var svg, circle, t, span;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			circle = svg_element("circle");
    			t = space();
    			span = element("span");
    			span.textContent = "ПАРТНЕРАМ";
    			attr_dev(circle, "cx", "5");
    			attr_dev(circle, "cy", "5");
    			attr_dev(circle, "r", "5");
    			attr_dev(circle, "fill", "#FF2929");
    			add_location(circle, file$8, 554, 10, 28386);
    			attr_dev(svg, "width", "10");
    			attr_dev(svg, "height", "10");
    			attr_dev(svg, "viewBox", "0 0 10 10");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file$8, 553, 8, 28280);
    			attr_dev(span, "class", "link svelte-1xiab02");
    			add_location(span, file$8, 556, 8, 28455);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, circle);
    			insert_dev(target, t, anchor);
    			insert_dev(target, span, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(svg);
    				detach_dev(t);
    				detach_dev(span);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_3.name, type: "slot", source: "(553:6) <Link to=\"partners\">", ctx });
    	return block;
    }

    // (559:6) <Link to="rules">
    function create_default_slot_2$1(ctx) {
    	var svg0, circle, t0, span, t2, svg1, path;

    	const block = {
    		c: function create() {
    			svg0 = svg_element("svg");
    			circle = svg_element("circle");
    			t0 = space();
    			span = element("span");
    			span.textContent = "ПРАВИЛА ПРОВЕДЕНИЯ";
    			t2 = space();
    			svg1 = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(circle, "cx", "5");
    			attr_dev(circle, "cy", "5");
    			attr_dev(circle, "r", "5");
    			attr_dev(circle, "fill", "#FF2929");
    			add_location(circle, file$8, 560, 10, 28643);
    			attr_dev(svg0, "width", "10");
    			attr_dev(svg0, "height", "10");
    			attr_dev(svg0, "viewBox", "0 0 10 10");
    			attr_dev(svg0, "fill", "none");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg0, file$8, 559, 8, 28537);
    			attr_dev(span, "class", "link svelte-1xiab02");
    			add_location(span, file$8, 562, 8, 28712);
    			attr_dev(path, "d", "M24.007 21.4445L19.2305 19.0565C18.78 18.831 18.5 18.378 18.5 17.874V16.1835C18.6145 16.0435 18.735\n            15.884 18.8595 15.708C19.479 14.833 19.9755 13.859 20.3365 12.8085C21.042 12.485 21.5 11.7875 21.5 11V9C21.5\n            8.5185 21.32 8.052 21 7.6875V5.028C21.028 4.753 21.138 3.116 19.954 1.7655C18.927 0.594 17.2605 0 15\n            0C12.7395 0 11.073 0.594 10.046 1.765C8.862 3.1155 8.972 4.753 9 5.028V7.6875C8.68 8.052 8.5 8.5185 8.5\n            9V11C8.5 11.6085 8.7765 12.176 9.2485 12.5545C9.7065 14.368 10.665 15.7345 11 16.173V17.8275C11 18.3115\n            10.736 18.7555 10.3115 18.9875L5.851 21.4205C4.4005 22.212 3.5 23.729 3.5 25.381V27C3.5 29.373 11.0225 30 15\n            30C18.9775 30 26.5 29.373 26.5 27V25.4785C26.5 23.7595 25.5445 22.2135 24.007 21.4445Z");
    			attr_dev(path, "fill", "#FF2929");
    			add_location(path, file$8, 564, 10, 28871);
    			attr_dev(svg1, "width", "30");
    			attr_dev(svg1, "height", "30");
    			attr_dev(svg1, "viewBox", "0 0 30 30");
    			attr_dev(svg1, "fill", "none");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg1, file$8, 563, 8, 28765);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, svg0, anchor);
    			append_dev(svg0, circle);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, span, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, svg1, anchor);
    			append_dev(svg1, path);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(svg0);
    				detach_dev(t0);
    				detach_dev(span);
    				detach_dev(t2);
    				detach_dev(svg1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_2$1.name, type: "slot", source: "(559:6) <Link to=\"rules\">", ctx });
    	return block;
    }

    // (578:6) {#if showSidebar}
    function create_if_block$2(ctx) {
    	var ul, li0, t1, li1, t3, li2, t5, li3, t7, div, label, t9, input, t10, button, dispose;

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "Поиск категорий";
    			t1 = space();
    			li1 = element("li");
    			li1.textContent = "Вся аналитика";
    			t3 = space();
    			li2 = element("li");
    			li2.textContent = "Фильтры";
    			t5 = space();
    			li3 = element("li");
    			li3.textContent = "Поддержка";
    			t7 = space();
    			div = element("div");
    			label = element("label");
    			label.textContent = "Загрузить в Excel";
    			t9 = space();
    			input = element("input");
    			t10 = space();
    			button = element("button");
    			button.textContent = "Добавить данные";
    			attr_dev(li0, "class", "svelte-1xiab02");
    			add_location(li0, file$8, 579, 10, 29819);
    			attr_dev(li1, "class", "svelte-1xiab02");
    			add_location(li1, file$8, 580, 10, 29854);
    			attr_dev(li2, "class", "svelte-1xiab02");
    			add_location(li2, file$8, 581, 10, 29887);
    			attr_dev(li3, "class", "svelte-1xiab02");
    			add_location(li3, file$8, 582, 10, 29914);
    			attr_dev(ul, "class", "svelte-1xiab02");
    			add_location(ul, file$8, 578, 8, 29804);
    			attr_dev(label, "for", "file");
    			attr_dev(label, "class", "svelte-1xiab02");
    			add_location(label, file$8, 586, 10, 29988);
    			attr_dev(input, "id", "file");
    			attr_dev(input, "type", "file");
    			input.multiple = true;
    			input.hidden = "hidden";
    			attr_dev(input, "class", "svelte-1xiab02");
    			add_location(input, file$8, 587, 10, 30042);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "svelte-1xiab02");
    			add_location(button, file$8, 588, 10, 30146);
    			attr_dev(div, "class", "buttons svelte-1xiab02");
    			add_location(div, file$8, 585, 8, 29956);
    			dispose = listen_dev(input, "change", ctx.change_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li0);
    			append_dev(ul, t1);
    			append_dev(ul, li1);
    			append_dev(ul, t3);
    			append_dev(ul, li2);
    			append_dev(ul, t5);
    			append_dev(ul, li3);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, label);
    			append_dev(div, t9);
    			append_dev(div, input);
    			append_dev(div, t10);
    			append_dev(div, button);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(ul);
    				detach_dev(t7);
    				detach_dev(div);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$2.name, type: "if", source: "(578:6) {#if showSidebar}", ctx });
    	return block;
    }

    // (598:6) <Route path="/">
    function create_default_slot_1$1(ctx) {
    	var current;

    	var landingroute = new LandingRoute({ $$inline: true });

    	const block = {
    		c: function create() {
    			landingroute.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(landingroute, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(landingroute.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(landingroute.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(landingroute, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1$1.name, type: "slot", source: "(598:6) <Route path=\"/\">", ctx });
    	return block;
    }

    // (193:0) <Router {url}>
    function create_default_slot$1(ctx) {
    	var div3, t0, div0, t1, t2, t3, div1, t4, div2, t5, t6, t7, t8, current;

    	var link0 = new Link({
    		props: {
    		to: "/",
    		$$slots: { default: [create_default_slot_5] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var link1 = new Link({
    		props: {
    		to: "/results",
    		$$slots: { default: [create_default_slot_4] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var link2 = new Link({
    		props: {
    		to: "partners",
    		$$slots: { default: [create_default_slot_3] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var link3 = new Link({
    		props: {
    		to: "rules",
    		$$slots: { default: [create_default_slot_2$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var if_block = (ctx.showSidebar) && create_if_block$2(ctx);

    	var route0 = new Route({
    		props: {
    		path: "results",
    		component: ChartRoute
    	},
    		$$inline: true
    	});

    	var route1 = new Route({
    		props: {
    		path: "landing",
    		component: LandingRoute
    	},
    		$$inline: true
    	});

    	var route2 = new Route({
    		props: {
    		path: "partners",
    		component: PartnersRoute
    	},
    		$$inline: true
    	});

    	var route3 = new Route({
    		props: {
    		path: "rules",
    		component: RulesRoute
    	},
    		$$inline: true
    	});

    	var route4 = new Route({
    		props: {
    		path: "/",
    		$$slots: { default: [create_default_slot_1$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			link0.$$.fragment.c();
    			t0 = space();
    			div0 = element("div");
    			link1.$$.fragment.c();
    			t1 = space();
    			link2.$$.fragment.c();
    			t2 = space();
    			link3.$$.fragment.c();
    			t3 = space();
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t4 = space();
    			div2 = element("div");
    			route0.$$.fragment.c();
    			t5 = space();
    			route1.$$.fragment.c();
    			t6 = space();
    			route2.$$.fragment.c();
    			t7 = space();
    			route3.$$.fragment.c();
    			t8 = space();
    			route4.$$.fragment.c();
    			attr_dev(div0, "class", "header svelte-1xiab02");
    			add_location(div0, file$8, 545, 4, 27959);
    			attr_dev(div1, "class", "side svelte-1xiab02");
    			add_location(div1, file$8, 576, 4, 29753);
    			attr_dev(div2, "class", "content svelte-1xiab02");
    			add_location(div2, file$8, 592, 4, 30235);
    			attr_dev(div3, "class", "app svelte-1xiab02");
    			toggle_class(div3, "sidebar-header", ctx.showSidebar);
    			add_location(div3, file$8, 193, 2, 3367);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			mount_component(link0, div3, null);
    			append_dev(div3, t0);
    			append_dev(div3, div0);
    			mount_component(link1, div0, null);
    			append_dev(div0, t1);
    			mount_component(link2, div0, null);
    			append_dev(div0, t2);
    			mount_component(link3, div0, null);
    			append_dev(div3, t3);
    			append_dev(div3, div1);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			mount_component(route0, div2, null);
    			append_dev(div2, t5);
    			mount_component(route1, div2, null);
    			append_dev(div2, t6);
    			mount_component(route2, div2, null);
    			append_dev(div2, t7);
    			mount_component(route3, div2, null);
    			append_dev(div2, t8);
    			mount_component(route4, div2, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link0_changes = {};
    			if (changed.$$scope) link0_changes.$$scope = { changed, ctx };
    			link0.$set(link0_changes);

    			var link1_changes = {};
    			if (changed.$$scope) link1_changes.$$scope = { changed, ctx };
    			link1.$set(link1_changes);

    			var link2_changes = {};
    			if (changed.$$scope) link2_changes.$$scope = { changed, ctx };
    			link2.$set(link2_changes);

    			var link3_changes = {};
    			if (changed.$$scope) link3_changes.$$scope = { changed, ctx };
    			link3.$set(link3_changes);

    			if (ctx.showSidebar) {
    				if (!if_block) {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			var route4_changes = {};
    			if (changed.$$scope) route4_changes.$$scope = { changed, ctx };
    			route4.$set(route4_changes);

    			if (changed.showSidebar) {
    				toggle_class(div3, "sidebar-header", ctx.showSidebar);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);

    			transition_in(link1.$$.fragment, local);

    			transition_in(link2.$$.fragment, local);

    			transition_in(link3.$$.fragment, local);

    			transition_in(route0.$$.fragment, local);

    			transition_in(route1.$$.fragment, local);

    			transition_in(route2.$$.fragment, local);

    			transition_in(route3.$$.fragment, local);

    			transition_in(route4.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			transition_out(link2.$$.fragment, local);
    			transition_out(link3.$$.fragment, local);
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			transition_out(route3.$$.fragment, local);
    			transition_out(route4.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div3);
    			}

    			destroy_component(link0);

    			destroy_component(link1);

    			destroy_component(link2);

    			destroy_component(link3);

    			if (if_block) if_block.d();

    			destroy_component(route0);

    			destroy_component(route1);

    			destroy_component(route2);

    			destroy_component(route3);

    			destroy_component(route4);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$1.name, type: "slot", source: "(193:0) <Router {url}>", ctx });
    	return block;
    }

    function create_fragment$a(ctx) {
    	var current;

    	var router = new Router({
    		props: {
    		url: ctx.url,
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			router.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var router_changes = {};
    			if (changed.url) router_changes.url = ctx.url;
    			if (changed.$$scope || changed.showSidebar) router_changes.$$scope = { changed, ctx };
    			router.$set(router_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$a.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	

      window.setInterval(() => {
        $$invalidate('showSidebar', showSidebar = location.pathname.length > 1);
      }, 100);

      const handleChangeFile = () => {
        pending.set(true);

        setTimeout(() => {
          pending.set(false);
        }, 1412);
      };

      let showSidebar;
      let { url = '' } = $$props;

    	const writable_props = ['url'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const change_handler = () => handleChangeFile();

    	$$self.$set = $$props => {
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    	};

    	$$self.$capture_state = () => {
    		return { showSidebar, url };
    	};

    	$$self.$inject_state = $$props => {
    		if ('showSidebar' in $$props) $$invalidate('showSidebar', showSidebar = $$props.showSidebar);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    	};

    	return {
    		handleChangeFile,
    		showSidebar,
    		url,
    		change_handler
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, ["url"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$a.name });
    	}

    	get url() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
