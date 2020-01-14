import zbx from '@z1/lib-feature-box'

// parts
import { types } from '../types'
import {
  nextViewState,
  onRouteEnter,
  viewActionParam,
  routingFromAction,
  findViewKey,
} from './parts'

// main
export const configure = zbx.fn((t, a, rx) => (boxName, props = {}) => {
  const path = t.pathOr(t.to.paramCase(boxName), ['path'], props)
  const defaultRoute = { authenticate: false }
  const routes = t.pathOr(
    {
      home: defaultRoute,
      view: defaultRoute,
      detail: defaultRoute,
      more: defaultRoute,
    },
    ['routes'],
    props
  )
  const viewMacros = t.pathOr(null, ['state', 'views'], props)
  const macroCtx = t.pick(
    ['viewKeys', 'params', '_shouldSub'],
    t.pathOr({}, ['state'], props)
  )
  if (t.isNil(viewMacros)) {
    return {}
  }
  return {
    initial: {
      status: 'init',
      route: {
        path: null,
        action: null,
        key: null,
      },
      params: {
        view: null,
        detail: null,
        more: null,
      },
      active: {
        param: null,
        view: null,
      },
      views: t.mapObjIndexed(macro => {
        return {
          status: types.status.init,
          reEnter: false,
          subbed: false,
          error: null,
          data: t.pathOr({}, ['initial', 'data'], macro),
          form: t.pathOr({}, ['initial', 'form'], macro),
          modal: t.pathOr(
            {
              open: false,
              type: null,
            },
            ['initial', 'modal'],
            macro
          ),
        }
      }, viewMacros),
    },
    routes(r) {
      const safePath = t.eq(path, '/') ? path : `/${path.replace(/\//g, '')}`
      return [
        r(
          safePath,
          'routeHome',
          onRouteEnter(viewMacros, 'view', macroCtx.viewKeys),
          routes.home || defaultRoute
        ),
        r(
          `${safePath}/:view`,
          'routeView',
          onRouteEnter(viewMacros, 'view', macroCtx.viewKeys),
          routes.view || defaultRoute
        ),
        r(
          `${safePath}/:view/:detail`,
          'routeViewDetail',
          onRouteEnter(viewMacros, 'detail', macroCtx.viewKeys),
          routes.detail || defaultRoute
        ),
        r(
          `${safePath}/:view/:detail/:more`,
          'routeViewMore',
          onRouteEnter(viewMacros, 'more', macroCtx.viewKeys),
          routes.more || defaultRoute
        ),
      ]
    },
    mutations(m) {
      return [
        m(['routeExit'], (state, action) => {
          const activeExit = t.pathOr(null, ['payload', 'active'], action)
          const exitStatus = t.pathOr(null, ['payload', 'status'], action)
          if (t.isNil(activeExit)) {
            return t.merge(state, { status: exitStatus })
          }
          const activeMacro = viewMacros[activeExit.view]
          const activeState = state.views[activeExit.view]
          const activeCtx = t.mergeAll([
            activeState,
            {
              event: types.event.routeExit,
            },
            t.pick(['route', 'params'], action.payload),
            { next: null },
          ])
          const nextActiveState = nextViewState(activeMacro, activeCtx)
          return t.mergeAll([
            state,
            {
              status: exitStatus,
              views: t.merge(state.views, {
                [activeExit.view]: nextActiveState,
              }),
            },
          ])
        }),
        m(['dataChange', 'dataLoad', 'dataLoadComplete'], (state, action) => {
          const event = t.to.paramCase(action.type.replace(`${boxName}/`, ''))
          const activeMacro = viewMacros[state.active.view]
          const activeState = state.views[state.active.view]
          const nextStatus = t.pathOr(
            activeState.status,
            ['payload', 'status'],
            action
          )
          const activeCtx = t.mergeAll([
            activeState,
            {
              event,
              status: nextStatus,
            },
            t.pick(['route', 'params'], state),
            { next: action.payload },
          ])

          const nextActiveState = nextViewState(activeMacro, activeCtx)
          return t.mergeAll([
            state,
            {
              views: t.merge(state.views, {
                [state.active.view]: nextActiveState,
              }),
            },
          ])
        }),
        m(['sub', 'unsub'], (state, action) => {
          const activeView = t.pathOr(null, ['payload', 'view'], action)
          if (t.isNil(activeView)) {
            return state
          }
          return t.merge(state, {
            views: t.merge(state.views, {
              [activeView]: t.merge(state.views[activeView], {
                subbed: t.pathOr(
                  state.views[activeView].subbed,
                  ['payload', 'subbed'],
                  action
                ),
              }),
            }),
          })
        }),
        m(
          ['formChange', 'formTransmit', 'formTransmitComplete'],
          (state, action) => {
            const event = t.to.paramCase(action.type.replace(`${boxName}/`, ''))
            const activeMacro = viewMacros[state.active.view]
            const activeState = state.views[state.active.view]
            const activeCtx = t.mergeAll([
              activeState,
              {
                event,
                status: t.eq(event, types.event.formChange)
                  ? activeState.status
                  : t.eq(event, types.event.formTransmit)
                  ? types.status.loading
                  : types.status.ready,
              },
              t.pick(['route', 'params'], state),
              { next: action.payload },
            ])
            if (t.eq(event, types.event.formChange)) {
              const nextForm = activeMacro.form(activeCtx)
              if (t.isNil(nextForm)) {
                return state
              }
              return t.merge(state, {
                views: t.merge(state.views, {
                  [state.active.view]: t.merge(activeState, {
                    form: t.merge(activeState, nextForm),
                  }),
                }),
              })
            }
            const nextActiveState = nextViewState(activeMacro, activeCtx)
            return t.mergeAll([
              state,
              {
                views: t.merge(state.views, {
                  [state.active.view]: nextActiveState,
                }),
              },
            ])
          }
        ),
        m('modalChange', (state, action) => {
          const activeMacro = viewMacros[state.active.view]
          const activeState = state.views[state.active.view]
          const activeCtx = t.mergeAll([
            activeState,
            {
              event: types.event.modalChange,
            },
            t.pick(['route', 'params'], state),
            { next: action.payload },
          ])
          const nextModal = activeMacro.modal(activeCtx)
          if (t.isNil(nextModal)) {
            return state
          }
          return t.merge(state, {
            views: t.merge(state.views, {
              [state.active.view]: t.merge(activeState, {
                modal: t.merge(
                  activeState.modal,
                  t.omit(['event', 'next', 'route', 'params'], nextModal)
                ),
              }),
            }),
          })
        }),
      ]
    },
    guards(g, { actions }) {
      return [
        g(
          [
            actions.routeHome,
            actions.routeView,
            actions.routeViewDetail,
            actions.routeViewMore,
          ],
          ({ action, redirect }, allow, reject) => {
            const viewKey = findViewKey(
              viewActionParam(actions, action),
              routingFromAction(action),
              macroCtx.viewKeys
            )
            if (t.not(t.isNil(viewKey))) {
              allow(action)
            } else {
              reject(
                redirect({
                  type: zbx.routing.notFound,
                  payload: {},
                })
              )
            }
          }
        ),
      ]
    },
    effects(fx, { actions, mutators }) {
      const routeActions = t.pick(
        ['routeHome', 'routeView', 'routeViewDetail', 'routeViewMore'],
        actions
      )
      const routeActionTypes = t.values(routeActions)
      const nextFx = [
        // routes enter / data load
        fx(
          [
            actions.routeHome,
            actions.routeView,
            actions.routeViewDetail,
            actions.routeViewMore,
            actions.dataLoad,
          ],
          async (context, dispatch, done) => {
            const boxState = t.path([boxName], context.getState())
            const activeState = t.path(
              ['views', boxState.active.view],
              boxState
            )
            const activeMacro = viewMacros[boxState.active.view]
            const [loadError, loadResult] = await a.of(
              activeMacro.load(
                t.mergeAll([
                  context,
                  activeState,
                  {
                    next: t.neq(context.action.type, actions.dataLoad)
                      ? null
                      : context.action.payload,
                  },
                ])
              )
            )
            if (loadError) {
              dispatch(
                mutators.dataLoadComplete({
                  error: loadError,
                  data: null,
                  status: types.status.ready,
                })
              )
            } else if (t.isNil(loadResult)) {
              dispatch(
                mutators.dataLoadComplete({
                  error: null,
                  data: null,
                  status: types.status.ready,
                })
              )
            } else {
              dispatch(
                mutators.dataLoadComplete(
                  t.merge(
                    {
                      error: null,
                      status: types.status.ready,
                    },
                    loadResult
                  )
                )
              )
            }
            done()
          }
        ),
        // routes exit
        fx(
          [t.globrex('*/ROUTING/*').regex, zbx.routing.notFound],
          async ({ getState, action }, dispatch, done) => {
            const state = getState()
            const prev = state.location.prev
            const boxState = state[boxName]
            if (t.not(t.includes(prev.type, routeActionTypes))) {
              done()
            } else {
              const routing = routingFromAction(prev, {
                pathname: ['pathname'],
                type: ['type'],
              })
              const paramType = viewActionParam(actions, prev)
              const viewKey = findViewKey(paramType, routing, macroCtx.viewKeys)
              dispatch(
                mutators.routeExit(
                  t.mergeAll([
                    {
                      status: t.includes(state.location.type, routeActionTypes)
                        ? 'active'
                        : 'inactive',
                      active: { param: viewKey.param, view: viewKey.key },
                    },
                    routing,
                  ])
                )
              )
              done()
            }
          }
        ),
        // form transmit
        fx([actions.formTransmit], async (context, dispatch, done) => {
          done()
        }),
      ]
      // yield
      return t.neq(macroCtx._shouldSub, true)
        ? nextFx
        : t.concat(nextFx, [
            fx(
              [actions.routeExit, actions.dataLoadComplete],
              ({ getState, action }, dispatch, done) => {
                const state = getState()
                const boxState = state[boxName]
                const mode = t.eq(action.type, actions.routeExit)
                  ? 'unsub'
                  : 'sub'
                const activeView = t.eq(mode, 'unsub')
                  ? t.pathOr(null, ['payload', 'active', 'view'], action)
                  : t.pathOr(null, ['active', 'view'], boxState)
                if (t.isNil(activeView)) {
                  done()
                } else {
                  const activeMacro = viewMacros[activeView]
                  const activeState = t.path(['views', activeView], boxState)
                  if (
                    t.allOf([
                      t.eq(activeMacro._shouldSub, false),
                      t.eq(activeState.subbed, false),
                    ])
                  ) {
                    done()
                  } else if (
                    t.allOf([
                      t.eq(action.type, actions.dataLoadComplete),
                      t.eq(activeState.reEnter, true),
                      t.eq(activeState.subbed, true),
                    ])
                  ) {
                    done()
                  } else if (
                    t.allOf([
                      t.eq(action.type, actions.dataLoadComplete),
                      t.eq(activeState.subbed, true),
                    ])
                  ) {
                    done()
                  } else if (
                    t.allOf([
                      t.eq(action.type, actions.routeExit),
                      t.eq(activeState.subbed, false),
                    ])
                  ) {
                    done()
                  } else {
                    dispatch(
                      mutators[mode]({
                        view: activeView,
                        subbed: t.eq(mode, 'sub'),
                      })
                    )
                    done()
                  }
                }
              }
            ),
            fx(
              actions.sub,
              context => {
                const activeView = t.pathOr(
                  null,
                  ['action', 'payload', 'view'],
                  context
                )
                if (t.isNil(activeView)) {
                  return null
                }
                if (
                  t.isNil(t.pathOr(null, [activeView, 'subscribe'], viewMacros))
                ) {
                  return null
                }
                return viewMacros[activeView].subscribe(context, {
                  actions,
                  mutators,
                  view: activeView,
                  name: boxName,
                })
              },
              {
                cancelType: actions.unsub,
                warnTimeout: 0,
                latest: true,
              }
            ),
          ])
    },
  }
})
