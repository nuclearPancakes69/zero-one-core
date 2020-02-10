import React from 'react'
import mx from '@z1/lib-feature-macros'

// main
export const login = mx.fn((t, a) =>
  mx.view.create('login', {
    state(ctx) {
      return {
        initial: {
          data: {
            url: null,
            login: null,
            files: [],
          },
        },
        data(props) {
          return ctx.macro.data(props)
        },
        async load(props) {
          return await ctx.macro.load(
            [
              {
                entity: 'url',
                data: props.api.url,
              },
              {
                entity: 'login',
                method: props.api
                  .service('machine-logins')
                  .get(props.params.detail),
              },
              {
                entity: 'files',
                method: props.api.service('bucket-registry').find({
                  query: {
                    includeAuthors: true,
                    createdBy: props.params.detail,
                    $sort: {
                      updatedAt: -1,
                    },
                    $limit: 10000,
                  },
                }),
                resultAt: 'data',
              },
            ],
            props
          )
        },
        subscribe(props) {
          return ctx.macro.subscribe([
            {
              id: '_id',
              entity: 'login',
              service: props.api.service('machine-logins'),
              events: ['patched'],
              mutator: props.mutators.dataChange,
              filter: login => t.eq(props.params.detail, t.at('_id', login)),
            },
            {
              id: '_id',
              entity: 'files',
              service: props.api.service('bucket-registry'),
              events: ['created', 'patched', 'removed'],
              mutator: props.mutators.dataChange,
              filter: file =>
                t.eq(props.params.detail, t.at('createdBy', file)),
            },
          ])
        },
      }
    },
    ui(ctx) {
      return props => {
        const status = t.at('state.status', props)
        const online = t.eq('online', t.at('state.data.login.status', props))
        return (
          <ctx.Page
            key="machine-profile"
            loading={t.includes(status, [
              ctx.status.init,
              ctx.status.waiting,
              ctx.status.loading,
            ])}
            render={() => (
              <React.Fragment>
                <ctx.Row key="title-bar" margin={{ bottom: 4 }}>
                  <ctx.IconLabel
                    icon={{
                      name: 'user-astronaut',
                      size: '3xl',
                      color: 'blue-500',
                    }}
                    label={{
                      text: 'Machine Login Profile',
                      fontWeight: 'bold',
                      fontSize: 'xl',
                    }}
                  />
                  <ctx.Spacer />
                  <ctx.IconLabel
                    display="inline-flex"
                    margin={{ right: 3 }}
                    color={online ? 'green-500' : 'gray-500'}
                    slots={{
                      label: {
                        padding: {
                          left: 2,
                        },
                      },
                    }}
                    icon={{
                      name: 'power-off',
                      size: '2xl',
                    }}
                    label={{
                      text: t.atOr('', 'state.data.login.status', props),
                      fontWeight: online ? 'medium' : 'light',
                      fontSize: 'lg',
                      letterSpacing: 'wide',
                    }}
                  />
                  <ctx.Button
                    icon="gear"
                    size="xs"
                    shape="circle"
                    fill="outline"
                    colors={{
                      off: 'blue-500',
                      on: {
                        bg: 'yellow-500',
                        border: 'yellow-500',
                        content: 'gray-900',
                      },
                    }}
                    onClick={() =>
                      props.mutations.modalChange({
                        open: true,
                        active: 'login',
                        id: t.at('state.data.login._id', props),
                        title: {
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
                        },
                        text:
                          'Enter an alias for this login below to continue.',
                      })
                    }
                  />
                </ctx.Row>
                <ctx.Row flex={1}>
                  <ctx.Col xs={12} md={6} x="left">
                    <ctx.IconLabel
                      display="inline-flex"
                      slots={{
                        label: {
                          padding: {
                            left: 2,
                          },
                        },
                      }}
                      icon={{
                        name: 'id-card',
                        size: '2xl',
                        color: 'yellow-500',
                      }}
                      label={{
                        text: 'alias',
                        fontSize: 'sm',
                        letterSpacing: 'wide',
                        color: 'gray-500',
                      }}
                      info={{
                        text: t.atOr('', 'state.data.login.alias', props),
                        fontWeight: 'medium',
                        fontSize: 'lg',
                        letterSpacing: 'wide',
                      }}
                      margin={{ bottom: 3 }}
                    />
                    <ctx.IconLabel
                      display="inline-flex"
                      slots={{
                        label: {
                          padding: {
                            left: 2,
                          },
                        },
                      }}
                      icon={{
                        name: ctx.icons.login(
                          t.atOr('', 'state.data.login.role', props)
                        ),
                        size: '2xl',
                        color: 'yellow-500',
                      }}
                      label={{
                        text: 'role',
                        fontSize: 'sm',
                        letterSpacing: 'wide',
                        color: 'gray-500',
                      }}
                      info={{
                        text: t.atOr('', 'state.data.login.role', props),
                        fontWeight: 'medium',
                        fontSize: 'lg',
                        letterSpacing: 'wide',
                      }}
                      margin={{ bottom: 3 }}
                    />
                    <ctx.IconLabel
                      display="inline-flex"
                      slots={{
                        label: {
                          padding: {
                            left: 2,
                          },
                        },
                      }}
                      icon={{
                        name: 'id-card',
                        size: '2xl',
                        color: 'yellow-500',
                      }}
                      label={{
                        text: 'host name',
                        fontSize: 'sm',
                        letterSpacing: 'wide',
                        color: 'gray-500',
                      }}
                      info={{
                        text: t.atOr('', 'state.data.login.hostname', props),
                        fontWeight: 'medium',
                        fontSize: 'lg',
                        letterSpacing: 'wide',
                      }}
                      margin={{ bottom: 3 }}
                    />
                    <ctx.IconLabel
                      display="inline-flex"
                      slots={{
                        label: {
                          padding: {
                            left: 2,
                          },
                        },
                      }}
                      icon={{
                        name: 'id-card',
                        size: '2xl',
                        color: 'yellow-500',
                      }}
                      label={{
                        text: 'user name',
                        fontSize: 'sm',
                        letterSpacing: 'wide',
                        color: 'gray-500',
                      }}
                      info={{
                        text: t.atOr('', 'state.data.login.username', props),
                        fontWeight: 'medium',
                        fontSize: 'lg',
                        letterSpacing: 'wide',
                      }}
                      margin={{ bottom: 3 }}
                    />
                  </ctx.Col>
                  <ctx.Col xs={12} md={6} x="left">
                    <ctx.IconLabel
                      margin={{ bottom: 3 }}
                      icon={{
                        name: 'cloud-upload-alt',
                        size: '2xl',
                        color: 'blue-500',
                      }}
                      label={{
                        text: `${t.atOr(
                          '',
                          'state.data.login.alias',
                          props
                        )} File Uploads`,
                        fontWeight: 'medium',
                        fontSize: 'lg',
                      }}
                    />
                    <ctx.VList
                      key="file-list"
                      items={t.atOr([], 'state.data.files', props)}
                      rowHeight={80}
                      render={(file, rowProps) => {
                        const hasAlias = t.notNil(file.alias)
                        const fileIcon = ctx.icons.file(file.ext)
                        return (
                          <ctx.ListItem
                            key={rowProps.key}
                            style={rowProps.style}
                            borderRadius="sm"
                            margin={{ bottom: 1 }}
                            transition="bg"
                            slots={{
                              main: {
                                padding: { x: 3, y: 2 },
                                bgColor: ['gray-800', { hover: 'gray-700' }],
                              },
                              title: {
                                justifyContent: 'between',
                              },
                            }}
                            avatar={{
                              icon: fileIcon.name,
                              size: 'md',
                              fill: 'ghost',
                              color: fileIcon.color,
                            }}
                            caption={{
                              label: {
                                text: file.ext,
                                fontSize: 'xs',
                                fontWeight: 'light',
                                letterSpacing: 'wide',
                                color: 'gray-300',
                              },
                            }}
                            title={{
                              slots: {
                                label: {
                                  display: 'flex',
                                  // flexDirection: 'row',
                                  margin: { top: 1 },
                                  y: 'center',
                                },
                              },
                              label: hasAlias
                                ? {
                                    text: file.alias,
                                    display: 'flex',
                                    flexDirection: 'col',
                                    fontSize: 'md',
                                    fontWeight: 'medium',
                                    margin: { right: 2, left: 0 },
                                  }
                                : null,
                              info: {
                                text: file.originalName,
                                display: 'flex',
                                flexDirection: 'col',
                                y: 'center',
                                x: 'center',
                                alignSelf: 'stretch',
                                fontSize: hasAlias ? 'sm' : 'md',
                                fontWeight: hasAlias ? 'light' : 'nornal',
                                letterSpacing: 'wide',
                                color: hasAlias ? 'gray-300' : null,
                                margin: { left: 0 },
                              },
                            }}
                            stamp={{
                              icon: 'clock',
                              label: {
                                text: ctx
                                  .dateFn()
                                  .to(ctx.dateFn(file.updatedAt)),
                                fontSize: 'xs',
                                fontWeight: 'light',
                              },
                              margin: { bottom: 2 },
                            }}
                            status={{
                              label: {
                                text: ctx.bytes(file.size),
                                fontSize: 'sm',
                                fontWeight: 'medium',
                              },
                              color: 'gray-300',
                            }}
                            buttons={[
                              {
                                icon: 'download',
                                shape: 'circle',
                                fill: 'ghost-solid',
                                size: 'xs',
                                color: 'blue-500',
                                as: 'a',
                                href: `${t.at(
                                  'state.data.url',
                                  props
                                )}/bucket-content/${file.fileId}`,
                                target: '_blank',
                              },
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
                                    active: 'file',
                                    title: {
                                      icon: {
                                        name: 'gear',
                                        color: 'blue-500',
                                        fontSize: '2xl',
                                      },
                                      label: {
                                        text: 'Edit file',
                                        color: 'blue-500',
                                        fontSize: 'lg',
                                      },
                                    },
                                    id: file._id,
                                  }),
                              },
                              {
                                icon: 'trash',
                                shape: 'circle',
                                fill: 'ghost-solid',
                                size: 'xs',
                                color: 'red-500',
                                margin: { left: 1 },
                                disabled: t.eq(
                                  ctx.status.loading,
                                  t.at('state.status', props)
                                ),
                                onClick: () =>
                                  props.mutations.modalChange({
                                    open: true,
                                    active: 'remove',
                                    id: file.fileId,
                                    title: {
                                      icon: {
                                        name: 'trash',
                                        color: 'red-500',
                                        fontSize: '2xl',
                                      },
                                      label: {
                                        text: 'Remove file',
                                        color: 'red-500',
                                        fontSize: 'lg',
                                      },
                                    },
                                    name: file.originalName,
                                  }),
                              },
                            ]}
                          />
                        )
                      }}
                    />
                  </ctx.Col>
                </ctx.Row>
              </React.Fragment>
            )}
          />
        )
      }
    },
  })
)