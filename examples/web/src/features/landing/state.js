import z from '@z1/lib-feature-box'
import mx from '@z1/lib-feature-macros'
import uix from '@z1/lib-ui-schema'

// parts
import views from './views'

// schema
// const landingNav = uix.nav.create(n => [
//   n('/', { title: 'home' }),
//   n('/about', { title: 'about' }, [
//     n('~/team', { title: 'about team' }, [
//       n('~/developers', { title: 'about developers' }),
//     ]),
//     n('~/partners', { title: 'about partners' }),
//   ]),
//   n('/contact', { title: 'contact' }, [
//     n('~/branches', { title: 'contact branches' }),
//     n('~/head-office', { title: 'contact head office' }),
//     n('~/map', { title: 'find us' }),
//   ]),
// ])
// const foundMap = uix.nav.find('/contact/map', landingNav)
// const contactForm = uix.form.create((f, k) =>
//   f({ type: k.object }, [
//     f('name', {
//       type: k.string,
//       title: 'Your name',
//       required: true,
//       ui: {
//         [k.ui.placeholder]: 'Please enter your name',
//         [k.ui.disabled]: false,
//         [k.ui.options]: {},
//       },
//     }),
//     f('email', {
//       type: k.string,
//       title: 'Your email',
//       required: true,
//       format: k.format.email,
//       ui: {
//         [k.ui.widget]: k.widget.email,
//         [k.ui.placeholder]: 'Please enter your email address',
//         [k.ui.disabled]: false,
//         [k.ui.options]: {},
//       },
//     }),
//   ])
// )

// main
const name = 'landing'
export const state = z.fn(t =>
  z.state.create(name, [
    {
      routes(r) {
        return [r('/', 'routeLanding', state => state)]
      },
    },
    mx.routeView.configure(name, {
      path: 'pages',
      state: views.state(),
      routes: {
        home: {},
        view: {},
        detail: {},
        more: {},
      },
    }),
  ])
)
