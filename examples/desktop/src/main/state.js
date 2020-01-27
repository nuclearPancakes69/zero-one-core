import z from '@z1/lib-state-box-node'

// main
const appState = z.fn((t, a) =>
  z.create('app', [
    {
      initial: {
        status: 'anon',
        error: null,
        agent: null,
        auth: null,
        services: [],
      },
      mutations(m) {
        return [
          m(['boot', 'bootComplete'], (state, action) => {
            return t.merge(state, action.payload)
          }),
          m(['authComplete'], (state, action) => {
            return t.merge(state, action.payload)
          }),
        ]
      },
      effects(fx, { actions, mutators }) {
        return [
          fx([actions.boot], async (ctx, dispatch, done) => {
            const [serviceErr, services] = await a.of(ctx.sysInfo.services('*'))
            if (serviceErr) {
              console.log('ERR finding services', serviceErr)
            }
            const matcher = t.globrex('**brave**')
            const nextServices = t.filter(
              service => matcher.regex.test(service.name),
              services || []
            )
            const [agentErr, agent] = await a.of(
              ctx.machine.account({ role: 'agent' })
            )
            if (agentErr) {
              dispatch(
                mutators.bootComplete({
                  agent: null,
                  error: agentErr,
                  services: nextServices,
                })
              )
            } else {
              const [authErr, authResult] = await a.of(
                ctx.api.authenticate({
                  strategy: 'machine',
                  hashId: agent.user.hashId,
                })
              )
              dispatch(
                mutators.bootComplete({
                  agent,
                  error: authErr,
                  auth: authResult,
                  services: nextServices,
                })
              )
              done()
            }
          }),
          fx([actions.bootComplete], async (ctx, dispatch, done) => {
            const state = ctx.getState()
            const accessToken = t.pathOr(
              null,
              ['app', 'auth', 'accessToken'],
              state
            )
            if (t.notNil(accessToken)) {
              dispatch(mutators.authComplete({ status: 'authenticated' }))
              done()
            } else {
              const agent = t.pathOr({}, ['app', 'agent'], state)
              const [systemErr, systemResult] = await a.of(
                ctx.machine.system(agent.machine)
              )
              const [accountErr, account] = await a.of(
                ctx.api
                  .service('machine-account')
                  .create(
                    t.isNil(systemErr)
                      ? { machine: systemResult, user: agent.user }
                      : agent
                  )
              )
              if (accountErr) {
                dispatch(
                  mutators.authComplete({
                    error: accountErr,
                  })
                )
              }
              const [authErr, authResult] = await a.of(
                ctx.api.authenticate({
                  strategy: 'machine',
                  hashId: account.user.hashId,
                })
              )
              dispatch(
                mutators.authComplete({
                  agent: account,
                  error: authErr,
                  auth: authResult,
                })
              )
              done()
            }
          }),
        ]
      },
      onInit({ dispatch, mutators, api }) {
        dispatch(mutators.boot({}))
        api.io.on('connect', () => {
          console.log('API CONNECT')
        })
        api.io.on('disconnect', () => {
          console.log('API DISCONNECT')
        })
      },
    },
  ])
)

export const state = [appState]
