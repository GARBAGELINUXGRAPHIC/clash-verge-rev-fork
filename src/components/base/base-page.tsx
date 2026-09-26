import { Typography } from '@mui/material'
import React, { ReactNode } from 'react'

import { BaseErrorBoundary } from './base-error-boundary'

interface Props {
  title?: React.ReactNode // the page title
  header?: React.ReactNode // something behind title
  contentStyle?: React.CSSProperties
  children?: ReactNode
  full?: boolean
}

export const BasePage: React.FC<Props> = (props) => {
  const { title, header, contentStyle, full, children } = props
  return (
    <BaseErrorBoundary>
      <div className="base-page">
        <header data-tauri-drag-region="true" style={{ userSelect: 'none' }}>
          <Typography
            component="h1"
            sx={{
              fontSize: 22,
              fontWeight: 600,
              minWidth: 0,
              overflowWrap: 'anywhere',
            }}
            data-tauri-drag-region="true"
          >
            {title}
          </Typography>

          {header && <div className="base-page-toolbar">{header}</div>}
        </header>

        <div className={full ? 'base-container no-padding' : 'base-container'}>
          <section>
            <div className="base-content" style={contentStyle}>
              {children}
            </div>
          </section>
        </div>
      </div>
    </BaseErrorBoundary>
  )
}
