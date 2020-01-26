import React from 'react'
import z from '@z1/lib-feature-box'
import { Row, Col, When, Icon } from '@z1/lib-ui-box-elements'
import { isRenderProp, renderText } from './common'

// elements
const iconProps = {
  key: 'icon',
  size: '2xl',
}
const renderIcon = z.fn(t => (props, baseProps = {}) => {
  const defaultProps = t.mergeDeepRight(iconProps, baseProps)
  if (isRenderProp(props)) {
    return props(defaultProps)
  }
  if (t.isType(props, 'string')) {
    return <Icon {...defaultProps} name={props} />
  }
  return <Icon {...defaultProps} {...props} />
})

// main
export const renderIconLabel = z.fn(t => props => {
  const cols = t.pathOr({}, ['cols'], props)
  // left col
  const left = t.pathOr(null, ['left'], cols)
  const icon = t.pathOr(null, ['icon'], props)
  const caption = t.pathOr(null, ['caption'], props)
  const hasIcon = t.and(t.notNil(icon), t.notEmpty(icon))
  const hasCaption = t.and(t.notNil(caption), t.notEmpty(caption))
  // right col
  const right = t.pathOr(null, ['right'], cols)
  const label = t.pathOr(null, ['label'], props)
  const info = t.pathOr(null, ['info'], props)
  const children = t.pathOr(null, ['children'], props)
  const hasLabel = t.and(t.notNil(label), t.notEmpty(label))
  const hasInfo = t.and(t.notNil(info), t.notEmpty(info))
  const hasChildren = t.isNil(children)
    ? false
    : t.gt(React.Children.count(children), 0)
  // element
  const nextProps = t.omit(
    ['cols', 'icon', 'caption', 'label', 'info', 'children'],
    props
  )
  return (
    <Row
      x="left"
      y="center"
      box={{
        display: 'inline-flex',
        alignSelf: 'auto',
      }}
      {...nextProps}
    >
      <When
        is={t.or(hasIcon, hasCaption)}
        render={() => {
          const nextChildren = (
            <React.Fragment>
              <When
                is={hasIcon}
                render={() => renderIcon(icon, { key: 'icon' })}
              />
              <When
                is={hasCaption}
                render={() =>
                  renderText(caption, {
                    key: 'caption',
                    y: 'bottom',
                    box: { fontSize: 'xs' },
                  })
                }
              />
            </React.Fragment>
          )
          const colProps = {
            y: 'center',
            x: 'center',
          }
          if (isRenderProp(left)) {
            return left({
              children: nextChildren,
              ...colProps,
            })
          }
          const nextProps = t.notNil(left) ? left : {}
          return (
            <Col key="col-left" {...colProps} {...nextProps}>
              {nextChildren}
            </Col>
          )
        }}
      />
      <When
        is={t.anyOf([hasLabel, hasInfo, hasChildren])}
        render={() => {
          const spacing = t.or(hasIcon, hasCaption)
            ? { box: { margin: { left: 1 } } }
            : {}
          const nextChildren = (
            <React.Fragment>
              <When
                is={hasLabel}
                render={() => renderText(label, { ...spacing, key: 'label' })}
              />
              <When
                is={hasInfo}
                render={() =>
                  renderText(info, {
                    key: 'info',
                    box: { fontSize: 'xs', ...spacing },
                  })
                }
              />
              <When
                is={hasChildren}
                render={() => <React.Fragment>{children}</React.Fragment>}
              />
            </React.Fragment>
          )
          const colProps = {
            y: 'center',
            x: 'left',
          }
          if (isRenderProp(right)) {
            return right({
              children: nextChildren,
              ...colProps,
            })
          }
          const nextProps = t.notNil(right) ? right : {}
          return (
            <Col key="col-right" {...colProps} {...nextProps}>
              {nextChildren}
            </Col>
          )
        }}
      />
    </Row>
  )
})

export class IconLabel extends React.Component {
  render() {
    return renderIconLabel(this.props)
  }
}
IconLabel.displayName = 'IconLabel'
