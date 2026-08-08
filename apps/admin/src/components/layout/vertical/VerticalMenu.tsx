// Next Imports
import { useParams } from 'next/navigation'

// MUI Imports
import Chip from '@mui/material/Chip'
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Type Imports
import type { getDictionary } from '@/utils/getDictionary'
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, SubMenu, MenuItem, MenuSection } from '@menu/vertical-menu'

// import { GenerateVerticalMenu } from '@components/GenerateMenu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

// Menu Data Imports
// import menuData from '@/data/navigation/verticalMenuData'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  dictionary: Awaited<ReturnType<typeof getDictionary>>
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='ri-arrow-right-s-line' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ dictionary, scrollMenu }: Props) => {
  // Hooks
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()
  const params = useParams()

  // Vars
  const { isBreakpointReached, transitionDuration } = verticalNavOptions
  const { lang: locale } = params

  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  return (
    // eslint-disable-next-line lines-around-comment
    /* Custom scrollbar instead of browser scroll, remove if you want browser scroll only */
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
          className: 'bs-full overflow-y-auto overflow-x-hidden',
          onScroll: container => scrollMenu(container, false)
        }
        : {
          options: { wheelPropagation: false, suppressScrollX: true },
          onScrollY: container => scrollMenu(container, true)
        })}
    >
      {/* Incase you also want to scroll NavHeader to scroll with Vertical Menu, remove NavHeader from above and paste it below this comment */}
      {/* Vertical Menu */}
      <Menu
        popoutMenuOffset={{ mainAxis: 10 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-line' /> }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >

        <MenuSection label={dictionary['navigation'].seperator}></MenuSection>
        <MenuItem
          href={`/${locale}/apps/ecommerce`}
          exactMatch={false}
          activeUrl='/apps/ecommerce'
          icon={<i className='ri-home-smile-line' />}
        >
          {dictionary['navigation'].dashboards}
        </MenuItem>

        <MenuSection label={dictionary['navigation'].seperator}>
          <SubMenu label={dictionary['navigation'].catalog} icon={<i className='ri-shopping-bag-3-line' />}>
            <MenuItem href={`/${locale}/apps/products/list`}>{dictionary['navigation'].products}</MenuItem>
            <MenuItem href={`/${locale}/apps/category/list`}>{dictionary['navigation'].category}</MenuItem>
            <MenuItem href={`/${locale}/apps/brand/list`}>{dictionary['navigation'].brands}</MenuItem>
            <MenuItem href={`/${locale}/apps/variant/list`}>{dictionary['navigation'].variant}</MenuItem>
            <MenuItem href={`/${locale}/apps/label/list`}>{dictionary['navigation'].label}</MenuItem>
            <MenuItem href={`/${locale}/apps/features/list`}>{dictionary['navigation'].features}</MenuItem>
            <MenuItem href={`/${locale}/apps/filter/list`}>{dictionary['navigation'].filter}</MenuItem>
          </SubMenu>
          <SubMenu label={dictionary['navigation'].order_management} icon={<i className='ri-wallet-line' />}>
            <MenuItem href={`/${locale}/apps/order/list`}>{dictionary['navigation'].order}</MenuItem>
            <MenuItem href={`/${locale}/apps/order/draft`}>{dictionary['navigation'].order_draft}</MenuItem>
            <MenuItem href={`/${locale}/apps/order/payment`}>{dictionary['navigation'].payment}</MenuItem>
            <MenuItem href={`/${locale}/apps/order/cart`}>{`${dictionary['navigation'].active} ${dictionary['navigation'].cart}`}</MenuItem>
          </SubMenu>
          <MenuItem icon={<i className='ri-map-pin-2-line' />} href={`/${locale}/apps/montage/list`}>Montaj Noktaları</MenuItem>

          <MenuSection label={dictionary['navigation'].seperator}></MenuSection>
          <SubMenu label={"Sayfa Yönetimi"} icon={<i className='ri-pages-line' />}>
            <MenuItem href={`/${locale}/apps/pages/list`}>{dictionary['navigation'].pages}</MenuItem>
            <MenuItem href={`/${locale}/apps/blogs/list`}>{dictionary['navigation'].blog}</MenuItem>
            <MenuItem href={`/${locale}/apps/`}>{dictionary['navigation'].form}</MenuItem>
            <MenuItem href={`/${locale}/apps/`}>{dictionary['navigation'].content_settings}</MenuItem>
          </SubMenu>
          <SubMenu label={dictionary['navigation'].user_management} icon={<i className='ri-user-2-line' />}>
            <MenuItem href={`/${locale}/apps/user/list`}>{dictionary['navigation'].user}</MenuItem>
            <MenuItem href={`/${locale}/apps/support/list`}>{dictionary['navigation'].support}</MenuItem>
          </SubMenu>
          <MenuSection label={dictionary['navigation'].seperator}></MenuSection>
          <SubMenu label={dictionary['navigation'].campaign_management} icon={<i className='ri-gift-fill' />}>
            <MenuItem href={`/${locale}/apps/campaign/list`}>{dictionary['navigation'].campaign}</MenuItem>
            <MenuItem href={`/${locale}/apps/campaign/promotions`}>{dictionary['navigation'].promotions}</MenuItem>
            <MenuItem href={`/${locale}/apps/campaign/buy-fast`}>{dictionary['navigation'].buy_fast}</MenuItem>
            <MenuItem href={`/${locale}/apps/purchase-limits/list`}>{dictionary['navigation'].order_limit}</MenuItem>
            <MenuItem href={`/${locale}/apps/campaign/package-creator`}>{dictionary['navigation'].package_creator}</MenuItem>
          </SubMenu>
          <MenuSection label={dictionary['navigation'].seperator}></MenuSection>
          <SubMenu label={"Eklentiler"} icon={<i className='ri-code-box-fill' />}>
            <MenuItem href={`/${locale}/apps/modules/dia`}>DİA E-Power</MenuItem>
            <MenuItem href={`/${locale}/apps/modules/netahsilat`}>Netahsilat</MenuItem>
            <MenuItem href={`/${locale}/apps/modules/wheelsize`}>Wheelsize</MenuItem>
            <MenuItem href={`/${locale}/apps/modules/akakce`}>Akakçe</MenuItem>
          </SubMenu>
          <MenuSection label={dictionary['navigation'].seperator}></MenuSection>
          <MenuItem icon={<i className="ri-image-2-line"></i>} href={`/${locale}/apps/media`}>Ortam Kütüphanesi</MenuItem>
          <MenuSection label={dictionary['navigation'].seperator}></MenuSection>
          <MenuItem icon={<i className="ri-puzzle-line"></i>} href={`/${locale}/apps/modules/xml`}>{dictionary['navigation'].xml}</MenuItem>
          <MenuSection label={dictionary['navigation'].seperator}></MenuSection>
          <SubMenu label={dictionary['navigation'].settings} icon={<i className="ri-settings-2-line" />}>
            <MenuItem href={`/${locale}/apps/settings/list`}>{dictionary['navigation'].general}</MenuItem>
            <MenuItem href={`/${locale}/apps/manager/list`}>{dictionary['navigation'].users}</MenuItem>
            <MenuItem href={`/${locale}/apps/design/list`}>{dictionary['navigation'].design_settings}</MenuItem>
            <MenuItem href={`/${locale}/apps/cargo/list`}>{dictionary['navigation'].cargo_settings}</MenuItem>
            <SubMenu label={dictionary['navigation'].mail_settings}>
              <MenuItem href={`/${locale}/apps/mail/management`}>{dictionary['navigation'].mail_management}</MenuItem>
              <MenuItem href={`/${locale}/apps/mail/accounts`}>{dictionary['navigation'].mail_accounts}</MenuItem>
              <MenuItem href={`/${locale}/apps/mail/smtp_settings`}>{dictionary['navigation'].mail_smtp}</MenuItem>
              <MenuItem href={`/${locale}/apps/mail/templates`}>{dictionary['navigation'].mail_templates}</MenuItem>
            </SubMenu>
            <MenuItem href={`/${locale}/apps/process`}>{dictionary['navigation'].process}</MenuItem>
          </SubMenu>
        </MenuSection>
      </Menu>
    </ScrollWrapper>
  )
}

export default VerticalMenu
