import mx from '@z1/lib-feature-macros'
const { types } = mx.view

// parts
const isAction = mx.fn(t => current =>
  t.allOf([t.has('type')(current), t.has('action')(current)])
)
const subx = mx.fn((t, _, rx) => subs => {
  const next = t.reduce(
    (collection, sub) => {
      const obs = t.map(
        event => ({
          service$: rx.fromEvent(sub.service, event),
          change: 'sub',
          event,
          entity: sub.entity,
          id: t.atOr('_id', 'id', sub),
          parent: t.at('parent', sub),
          mutator: t.at('mutator', sub),
        }),
        sub.events
      )
      return t.concat(collection, obs)
    },
    [],
    subs
  )
  const entry = t.head(next)
  if (t.eq(t.len(next), 1)) {
    return entry.service$.pipe(
      rx.map(current =>
        entry.mutator({
          change: 'sub',
          id: t.atOr('_id', 'id', entry),
          parent: t.at('parent', entry),
          entity: entry.entity,
          event: entry.event,
          data: current,
        })
      )
    )
  }
  const rest$ = t.map(obs => {
    return obs.service$.pipe(
      rx.map(current => {
        if (isAction(current)) {
          return current
        }
        return obs.mutator({
          change: 'sub',
          id: t.atOr('_id', 'id', obs),
          parent: t.at('parent', obs),
          entity: obs.entity,
          event: obs.event,
          data: current,
        })
      })
    )
  }, t.tail(next))
  return entry.service$.pipe(
    rx.merge(...rest$),
    rx.map(current => {
      if (isAction(current)) {
        return current
      }
      return entry.mutator({
        change: 'sub',
        id: t.atOr('_id', 'id', entry),
        parent: t.at('parent', entry),
        entity: entry.entity,
        event: entry.event,
        data: current,
      })
    })
  )
})

const mutateEntityList = mx.fn(t => (id, event, entity, list = []) =>
  t.runMatch({
    _: () => list,
    created: () => t.append(entity, list),
    patched: () =>
      t.update(
        t.findIndex(current => t.eq(current[id], entity[id]), list),
        entity,
        list
      ),
    removed: () =>
      t.filter(current => t.not(t.eq(current[id], entity[id])), list),
  })(t.eq(event, 'updated') ? 'patched' : event)
)
const datax = mx.fn(t => props => {
  return {
    status: t.atOr(props.status, 'next.status', props),
    error: t.atOr(null, 'next.error', props),
    data: t.runMatch({
      _: () => props.data,
      [types.event.dataLoadComplete]: () => {
        const nextData = t.atOr({}, 'next.data', props)
        if (t.isEmpty(nextData)) {
          return props.data
        }
        return t.merge(props.data, nextData)
      },
      [types.event.dataChange]: () => {
        const change = t.at('next.change', props)
        if (t.isNil(change)) {
          return props.data
        }
        return t.runMatch({
          _: () => props.data,
          sub: () => {
            const id = t.atOr('_id', 'next.id', props)
            const parent = t.at('next.parent', props)
            const entity = t.at('next.entity', props)
            const event = t.at('next.event', props)
            const data = t.at('next.data', props)
            if (t.anyOf([t.isNil(entity), t.isNil(event), t.isNil(data)])) {
              return props.data
            }
            const entityList = t.split('.', entity)
            const hasNested = t.gt(t.len(entityList), 1)
            if (t.not(hasNested)) {
              return t.merge(props.data, {
                [entity]: mutateEntityList(
                  id,
                  event,
                  data,
                  t.at(entity, props.data)
                ),
              })
            }
            if (t.isNil(parent)) {
              return props.data
            }
            const parentPath = t.head(entityList)
            const nestedPath = t.tail(entityList)
            const lastIndex = t.len(nestedPath) - 1
            const parents = t.at(parentPath, props.data)
            return t.merge(props.data, {
              [parentPath]: t.adjust(
                t.findIndex(
                  current => t.eq(current[id], data[parent]),
                  parents
                ),
                current => {
                  const next = t.reduce(
                    (collection, nextPath) => {
                      if (t.neq(lastIndex, nextPath.index)) {
                        const path = t.append(nextPath.key, collection.path)
                        return t.merge(collection, {
                          path,
                          data: t.merge(collection.data, {
                            [nextPath.key]: t.path(path, current),
                          }),
                        })
                      }
                      return t.merge(collection, {
                        path: nestedPath,
                        data: t.merge(collection.data, {
                          [nextPath.key]: mutateEntityList(
                            id,
                            event,
                            data,
                            t.pathOr([], nestedPath, current)
                          ),
                        }),
                      })
                    },
                    {
                      path: [],
                      data: {},
                    },
                    t.mapIndexed((key, index) => ({ key, index }), nestedPath)
                  )
                  return t.merge(current, next.data)
                },
                parents
              ),
            })
          },
          search: () => props.data,
          sort: () => props.data,
        })(change)
      },
    })(props.event),
  }
})
const loadx = mx.fn((t, a) => async (loadList, props) => {
  // TODO: exec loadlist and handle errs
  return {
    status: props.status,
    error: null,
    data: {},
  }
})
const formx = mx.fn(t => (forms, props) => {
  // TODO: other active sources + load event
  const active = t.eq(types.event.modalChange, props.event)
    ? t.atOr('none', 'next.active', props)
    : t.atOr('none', 'modal.active', props)

  const form = t.at(active, forms)
  if (t.isNil(form)) {
    return null
  }
  const activeForm = t.path(['form', active], props)
  return t.runMatch({
    _: () => null,
    [types.event.dataLoadComplete]: () => null,
    [types.event.modalChange]: () => {
      const open = t.at('next.open', props)
      const id = t.at('next.id', props)
      const entity = t.at('entity', activeForm)
      if (t.anyOf([t.isNil(id), t.isNil(entity), t.not(open)])) {
        return {
          [active]: t.merge(activeForm, {
            data: {},
            ui: form.ui({ disabled: false }),
          }),
        }
      }
      const entityList = t.split('.', entity)
      const hasNested = t.gt(t.len(entityList), 1)
      const parentPath = t.head(entityList)
      const nestedPath = hasNested ? t.tail(entityList) : []
      const preData = hasNested
        ? t.reduce(
            (collection, parent) => {
              const nested = t.pathOr(null, nestedPath, parent)
              return t.isType(nested, 'array')
                ? t.concat(collection, nested)
                : collection
            },
            [],
            t.pathOr([], ['data', parentPath], props)
          )
        : t.pathOr([], ['data', parentPath], props)
      const data = t.find(current => {
        return t.eq(current._id, id)
      }, preData)
      if (t.isNil(data)) {
        return activeForm
      }
      return {
        [active]: t.merge(activeForm, {
          data,
          ui: form.ui({ disabled: false }),
        }),
      }
    },
    [types.event.formTransmit]: () => {
      return {
        [active]: t.merge(activeForm, {
          data: t.atOr({}, 'next.data', props),
          ui: form.ui({ disabled: true }),
        }),
      }
    },
    [types.event.formTransmitComplete]: () => {
      return {
        [active]: t.merge(activeForm, {
          data: t.notNil(t.at('next.error', props))
            ? t.pathOr({}, ['form', active, 'data'], props)
            : {},
          ui: form.ui({ disabled: false }),
        }),
      }
    },
  })(props.event)
})
const transmitx = mx.fn((t, a) => async (transmitList, props) => {
  // TODO: active form from transmitList
  return {
    status: props.status,
    error: null,
    data: {},
  }
})
const modalx = mx.fn(t => props => {
  return t.runMatch({
    _: () => props.modal,
    [types.event.modalChange]: () => {
      const active = t.at('next.active', props)
      return t.merge(props.modal, {
        active,
        open: t.atOr(false, 'next.open', props),
        id: t.atOr(null, 'next.id', props),
        title: t.atOr({}, 'next.title', props),
        content: t.omit(
          ['active', 'id', 'open', 'title'],
          t.atOr({}, 'next', props)
        ),
      })
    },
    [types.event.formTransmitComplete]: () => {
      if (t.not(t.at('modal.open', props))) {
        return props.modal
      }
      return t.isNil(t.at('next.error', props))
        ? t.merge(props.modal, {
            open: false,
            active: null,
            id: null,
            title: {},
            content: {},
          })
        : props.modal
    },
  })(props.event)
})

// main
export const macros = {
  subscribe: subx,
  data: datax,
  load: loadx,
  form: formx,
  transmit: transmitx,
  modal: modalx,
}
