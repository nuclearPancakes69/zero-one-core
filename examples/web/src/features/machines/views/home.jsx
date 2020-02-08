import React from 'react'
import mx from '@z1/lib-feature-macros'
import sc from '@z1/lib-ui-schema'

// parts
const aliasForm = mx.fn(t => entity => props =>
  sc.form.create((f, k) =>
    f({ type: k.object }, [
      f('alias', {
        title: `${t.to.sentenceCase(entity)} Alias`,
        type: k.string,
        required: true,
        ui: {
          [k.ui.placeholder]: `Enter an alias for this ${t.to.lowerCase(
            entity
          )}`,
          [k.ui.disabled]: props.disabled,
        },
      }),
    ])
  )
)
const forms = {
  machine: {
    entity: 'machines',
    ui: aliasForm('machine'),
  },
  login: {
    entity: 'machines.logins',
    ui: aliasForm('login'),
  },
}
const modals = mx.fn(t => ({
  title: t.runMatch({
    _: () => ({ icon: null, label: null }),
    machine: () => ({
      icon: {
        name: 'laptop',
        color: 'blue-500',
        fontSize: '2xl',
      },
      label: {
        text: 'Machine',
        color: 'blue-500',
        fontSize: 'lg',
      },
    }),
    login: () => ({
      icon: {
        name: 'user-circle',
        color: 'blue-500',
        fontSize: '2xl',
      },
      label: {
        text: 'Machine Login',
        color: 'blue-500',
        fontSize: 'lg',
      },
    }),
  }),
  content: next => t.omit(['modal', 'id', 'open', 'title'], next),
}))

// main
export const home = mx.fn((t, a, rx) =>
  mx.view.create('home', {
    state(ctx) {
      return {
        initial: {
          data: {
            machines: [],
          },
          form: t.mapObjIndexed(
            form => ({
              entity: form.entity,
              data: {},
              ui: form.ui({ disabled: false }),
            }),
            forms
          ),
          modal: {
            open: false,
            active: null,
            id: null,
            title: {},
            content: {},
          },
        },
        data(props) {
          return ctx.macros.data(props)
          // return {
          //   status: props.status,
          //   error: t.atOr(null, 'next.error', props),
          //   data: t.runMatch({
          //     _: () => props.data,
          //     [ctx.event.dataLoadComplete]: () =>
          //       t.merge(props.data, {
          //         machines: t.atOr(
          //           props.data.machines,
          //           'next.data.machines',
          //           props
          //         ),
          //       }),
          //     [ctx.event.dataChange]: () => {
          //       // events from subscribe
          //       const event = t.at('next.event', props)
          //       const machines = t.at('data.machines', props)
          //       // machine events
          //       if (t.eq('machine', t.at('next.entity', props))) {
          //         const machine = t.at('next.data', props)
          //         return t.merge(props.data, {
          //           machines: t.runMatch({
          //             _: () => machines,
          //             created: () => t.append(machine, machines),
          //             patched: () =>
          //               t.update(
          //                 t.findIndex(
          //                   current => t.eq(current._id, machine._id),
          //                   machines
          //                 ),
          //                 machine,
          //                 machines
          //               ),
          //           })(event),
          //         })
          //       }
          //       // login events
          //       const login = t.at('next.data', props)
          //       const machineIndex = t.findIndex(
          //         machine => t.eq(machine._id, login.machineId),
          //         machines
          //       )
          //       if (t.eq(machineIndex, -1)) {
          //         return props.data
          //       }
          //       const logins = t.atOr(
          //         [],
          //         'logins',
          //         machines[machineIndex] || {}
          //       )
          //       return t.merge(props.data, {
          //         machines: t.adjust(
          //           machineIndex,
          //           machine =>
          //             t.merge(machine, {
          //               logins: t.runMatch({
          //                 _: () => machine.logins,
          //                 patched: () =>
          //                   t.update(
          //                     t.findIndex(
          //                       current => t.eq(current._id, login._id),
          //                       logins
          //                     ),
          //                     login,
          //                     logins
          //                   ),
          //                 created: () => t.append(login, logins),
          //               })(event),
          //             }),
          //           machines
          //         ),
          //       })
          //     },
          //   })(props.event),
          // }
        },
        async load(props) {
          const [machErr, machines] = await a.of(
            props.api.service('machines').find({
              query: {
                $sort: {
                  updatedAt: -1,
                },
                $limit: 10000,
              },
            })
          )
          if (machErr) {
            return {
              status: props.status,
              error: machErr,
              data: {
                machines: [],
              },
            }
          }
          return {
            status: props.status,
            error: null,
            data: {
              machines: machines.data,
            },
          }
        },
        subscribe(props) {
          const mutator = t.at('mutators.dataChange', props)
          const events = ['created', 'patched']
          return ctx.macros.subscribe([
            {
              id: '_id',
              entity: 'machines',
              service: props.api.service('machines'),
              events,
              mutator,
            },
            {
              id: '_id',
              parent: 'machineId',
              entity: 'machines.logins',
              service: props.api.service('machine-logins'),
              events,
              mutator,
            },
          ])
        },
        form(props) {
          const active = t.eq(ctx.event.modalChange, props.event)
            ? t.atOr('none', 'next.modal', props)
            : t.atOr('none', 'modal.active', props)
          const form = t.at(active, forms)
          if (t.isNil(form)) {
            return null
          }
          const activeForm = t.path(['form', active], props)
          return t.runMatch({
            _: () => null,
            [ctx.event.modalChange]: () => {
              const id = t.at('next.id', props)
              const entity = t.at('entity', activeForm)
              if (t.or(t.isNil(id), t.isNil(entity))) {
                return {
                  [active]: t.merge(activeForm, {
                    data: {},
                    ui: form.ui({ disabled: false }),
                  }),
                }
              }
              const nestedEntityList = t.split('.', entity)
              const hasNested = t.gt(t.len(nestedEntityList), 1)
              const parentEntity = t.head(nestedEntityList)
              const nestedPath = hasNested ? t.tail(nestedEntityList) : []
              const preData = hasNested
                ? t.reduce(
                    (collection, parent) => {
                      const nested = t.pathOr(null, nestedPath, parent)
                      console.log('nested', nested)
                      return t.isType(nested, 'array')
                        ? t.concat(collection, nested)
                        : collection
                    },
                    [],
                    t.pathOr([], ['data', parentEntity], props)
                  )
                : t.pathOr([], ['data', parentEntity], props)
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
            [ctx.event.formTransmit]: () => {
              return {
                [active]: t.merge(activeForm, {
                  data: t.atOr({}, 'next.data', props),
                  ui: form.ui({ disabled: true }),
                }),
              }
            },
            [ctx.event.formTransmitComplete]: () => {
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
        },
        async transmit(props) {
          return await t.runMatch({
            _: async () => null,
            machine: async () => {
              const data = t.at('form.machine.data', props)
              const payload = t.pick(['_id', 'alias'], data)
              if (t.isNil(payload._id)) {
                return null
              }
              const [machErr] = await a.of(
                props.api
                  .service('machines')
                  .patch(payload._id, { alias: payload.alias })
              )
              if (machErr) {
                return {
                  status: ctx.status.fail,
                  error: machErr,
                  data,
                }
              }
              return {
                status: props.status,
                error: null,
                data: {},
              }
            },
            login: async () => {
              const data = t.at('form.login.data', props)
              const payload = t.pick(['_id', 'alias'], data)
              if (t.isNil(payload._id)) {
                return null
              }
              const [loginErr] = await a.of(
                props.api
                  .service('machine-logins')
                  .patch(payload._id, { alias: payload.alias })
              )
              if (loginErr) {
                return {
                  status: ctx.status.fail,
                  error: loginErr,
                  data,
                }
              }
              return {
                status: props.status,
                error: null,
                data: {},
              }
            },
          })(t.at('modal.active', props))
        },
        modal(props) {
          return t.runMatch({
            _: () => props.modal,
            [ctx.event.modalChange]: () => {
              const active = t.at('next.active', props)
              return t.merge(props.modal, {
                active,
                open: t.atOr(false, 'next.open', props),
                id: t.atOr(null, 'next.id', props),
                title: modals.title(active),
                content: modals.content(props.next),
              })
            },
            [ctx.event.formTransmitComplete]: () => {
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
        },
      }
    },
    ui(ctx) {
      const itemHeight = {
        main: 90,
        nested: 76,
      }
      return props => {
        const machines = t.atOr([], 'state.data.machines', props)
        const status = t.at('state.status', props)
        const active = t.atOr('machine', 'state.modal.active', props)
        return (
          <ctx.Page
            key="machines"
            loading={t.includes(status, [ctx.status.waiting, ctx.status.init])}
            render={() => (
              <React.Fragment>
                <ctx.IconLabel
                  icon={{ name: 'laptop', size: '3xl', color: 'blue-500' }}
                  label={{
                    text: 'Machines',
                    fontWeight: 'bold',
                    fontSize: 'xl',
                  }}
                  margin={{ bottom: 4 }}
                />
                <ctx.VList
                  key="machine-list"
                  items={machines}
                  rowHeight={({ index }) => {
                    const machine = machines[index]
                    return t.isNil(machine)
                      ? itemHeight.main
                      : itemHeight.nested *
                          t.len(t.atOr([], 'logins', machine)) +
                          itemHeight.main
                  }}
                  render={(machine, rowProps) => {
                    return (
                      <ctx.ListItem
                        key={rowProps.key}
                        style={rowProps.style}
                        borderRadius="sm"
                        transition="bg"
                        margin={{ bottom: 1 }}
                        slots={{
                          main: {
                            padding: { x: 3, y: 3 },
                          },
                        }}
                        avatar={{
                          icon: ctx.icons.machine(machine.type),
                          fill: 'ghost',
                          color: 'blue-500',
                          size: 'lg',
                        }}
                        title={{
                          label: {
                            text: machine.alias,
                            fontSize: 'lg',
                            letterSpacing: 'wide',
                            margin: { bottom: 2 },
                          },
                          info: {
                            text: `${machine.distro} v${machine.release} ${machine.arch}`,
                            fontSize: 'sm',
                            color: 'blue-500',
                          },
                        }}
                        subtitle={{
                          icon: { name: 'laptop', size: 'lg' },
                          label: {
                            text: machine.hardwareuuid,
                            fontSize: 'xs',
                            fontWeight: 'light',
                          },
                          color: 'gray-400',
                        }}
                        stamp={{
                          icon: 'clock',
                          label: {
                            text: ctx
                              .dateFn(machine.updatedAt)
                              .format('YYYY MM DD HH:mm:ss A'),
                            fontSize: 'xs',
                            fontWeight: 'light',
                          },
                          margin: { bottom: 2 },
                        }}
                        buttons={[
                          {
                            icon: 'gear',
                            shape: 'circle',
                            fill: 'ghost-solid',
                            size: 'xs',
                            color: 'blue-500',
                            disabled: t.eq(
                              ctx.status.loading,
                              t.at('state.status', props)
                            ),
                            onClick: () =>
                              props.mutations.modalChange({
                                open: true,
                                active: 'machine',
                                id: machine._id,
                                text:
                                  'Enter an alias for this machine below to continue.',
                              }),
                          },
                          {
                            icon: 'arrow-circle-right',
                            shape: 'circle',
                            fill: 'ghost-solid',
                            size: 'xs',
                            color: 'blue-500',
                            as: ctx.Link,
                            to: `/machines/profile/${machine._id}`,
                          },
                        ]}
                      >
                        <ctx.MapIndexed
                          items={t.atOr([], 'logins', machine)}
                          render={(login, index) => {
                            const online = t.eq(login.status, 'online')
                            return (
                              <ctx.ListItem
                                key={`nested_login_${login._id}_${index}`}
                                width="full"
                                transition="bg"
                                margin={{ bottom: 1 }}
                                slots={{
                                  main: {
                                    padding: { x: 3, y: 2 },
                                    bgColor: [
                                      'gray-800',
                                      { hover: 'gray-700' },
                                    ],
                                  },
                                }}
                                avatar={{
                                  icon: ctx.icons.login(login.role),
                                  size: 'md',
                                  fill: 'ghost',
                                  color: 'yellow-500',
                                }}
                                title={{
                                  label: {
                                    text: login.alias,
                                    fontSize: 'md',
                                    fontWeight: 'light',
                                    letterSpacing: 'wider',
                                    margin: { bottom: 2 },
                                  },
                                  info: {
                                    text: login.role,
                                    fontSize: 'sm',
                                    fontWeight: 'medium',
                                    letterSpacing: 'wide',
                                    color: 'yellow-500',
                                  },
                                }}
                                stamp={{
                                  icon: 'clock',
                                  label: {
                                    text: ctx
                                      .dateFn()
                                      .to(ctx.dateFn(login.updatedAt)),
                                    fontSize: 'xs',
                                    fontWeight: 'light',
                                  },
                                  margin: { bottom: 2 },
                                }}
                                status={{
                                  icon: { name: 'power-off', size: 'lg' },
                                  label: {
                                    text: login.status,
                                    fontSize: 'sm',
                                    fontWeight: online ? 'medium' : 'light',
                                    letterSpacing: 'wide',
                                  },
                                  color: online ? 'green-500' : 'gray-500',
                                }}
                                buttons={[
                                  {
                                    icon: 'gear',
                                    shape: 'circle',
                                    fill: 'ghost-solid',
                                    size: 'xs',
                                    color: 'blue-500',
                                    margin: { left: 1 },
                                    disabled: t.eq(
                                      ctx.status.loading,
                                      t.at('state.status', props)
                                    ),
                                    onClick: () =>
                                      props.mutations.modalChange({
                                        open: true,
                                        active: 'login',
                                        id: login._id,
                                        text:
                                          'Enter an alias for this login below to continue.',
                                      }),
                                  },
                                  {
                                    icon: 'arrow-circle-right',
                                    shape: 'circle',
                                    fill: 'ghost-solid',
                                    size: 'xs',
                                    color: 'blue-500',
                                    margin: { left: 1 },
                                    as: ctx.Link,
                                    to: `/machines/login/${login._id}`,
                                  },
                                ]}
                              />
                            )
                          }}
                        />
                      </ctx.ListItem>
                    )
                  }}
                />
                <ctx.Modal
                  key="view-modal"
                  title={t.at('state.modal.title', props)}
                  open={t.atOr(false, 'state.modal.open', props)}
                  onClose={() => props.mutations.modalChange({ open: false })}
                  slots={{
                    buttons: {
                      x: 'center',
                    },
                  }}
                >
                  <ctx.IconLabel
                    slots={{
                      label: { x: 'center' },
                    }}
                    label={{
                      text: t.atOr('Edit', 'state.modal.content.text', props),
                      fontSize: 'lg',
                      fontWeight: 'medium',
                      letterSpacing: 'wide',
                    }}
                  />
                  <ctx.When
                    is={t.notNil(props.state.error)}
                    render={() => (
                      <ctx.Alert
                        icon="exclamation-triangle"
                        message={t.atOr(
                          'Operation failed',
                          'state.error.message',
                          props
                        )}
                        color="orange-500"
                        margin={{ top: 3 }}
                        x="center"
                      />
                    )}
                  />
                  <ctx.Form
                    schema={t.path(
                      ['state', 'form', active, 'ui', 'schema'],
                      props
                    )}
                    uiSchema={t.path(
                      ['state', 'form', active, 'ui', 'uiSchema'],
                      props
                    )}
                    formData={t.path(['state', 'form', active, 'data'], props)}
                    onSubmit={payload =>
                      props.mutations.formTransmit({
                        data: payload.formData,
                      })
                    }
                    x="center"
                  >
                    <ctx.Match
                      value={active}
                      render={{
                        machine: () => {
                          const machine = t.pathOr(
                            {},
                            ['state', 'form', active, 'data'],
                            props
                          )
                          const noAlias = t.isNil(machine.alias)
                          const machineIcon = ctx.icons.machine(machine.type)
                          const machineName = `${machine.manufacturer} model: ${machine.model} serial: ${machine.serialnumber}`
                          return (
                            <ctx.IconLabel
                              alignSelf="start"
                              margin={{ y: 1 }}
                              icon={{
                                name: machineIcon,
                                size: '4xl',
                                color: 'blue-500',
                              }}
                              label={{
                                text: t.atOr(machineName, 'alias', machine),
                                fontSize: 'md',
                                margin: noAlias
                                  ? { left: 2 }
                                  : { left: 2, bottom: 1 },
                              }}
                              info={{
                                text: noAlias
                                  ? `${machine.distro} v${machine.release} ${machine.arch}`
                                  : machineName,
                                fontSize: 'sm',
                                color: 'gray-400',
                                margin: { left: 2 },
                              }}
                            />
                          )
                        },
                        login: () => {
                          const login = t.pathOr(
                            {},
                            ['state', 'form', active, 'data'],
                            props
                          )
                          const noAlias = t.isNil(login.alias)
                          const loginIcon = ctx.icons.login(login.role)
                          const loginName = `host: ${login.hostname} user: ${login.username}`
                          return (
                            <ctx.IconLabel
                              alignSelf="start"
                              margin={{ y: 1 }}
                              icon={{
                                name: loginIcon,
                                size: '4xl',
                                color: 'yellow-500',
                              }}
                              caption={{
                                text: login.role,
                              }}
                              label={{
                                text: t.atOr(loginName, 'alias', login),
                                fontSize: noAlias ? 'md' : 'lg',
                                margin: noAlias
                                  ? { left: 2 }
                                  : { left: 2, bottom: 1 },
                              }}
                              info={
                                noAlias
                                  ? null
                                  : {
                                      text: loginName,
                                      fontSize: 'sm',
                                      color: 'gray-400',
                                      margin: { left: 2 },
                                    }
                              }
                            />
                          )
                        },
                      }}
                    />
                    <ctx.Row x="center" y="center" margin={{ top: 3 }}>
                      <ctx.Button
                        reverse
                        label="Continue"
                        icon="arrow-circle-right"
                        type="submit"
                        size="md"
                        shape="pill"
                        fill="outline"
                        colors={{ on: 'blue-500', off: 'yellow-500' }}
                        loading={t.eq(
                          ctx.status.loading,
                          t.at('state.status', props)
                        )}
                      />
                    </ctx.Row>
                  </ctx.Form>
                </ctx.Modal>
              </React.Fragment>
            )}
          />
        )
      }
    },
  })
)
