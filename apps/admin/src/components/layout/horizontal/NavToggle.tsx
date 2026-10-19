import useVerticalNav from '@menu/hooks/useVerticalNav'
import useHorizontalNav from '@menu/hooks/useHorizontalNav'

const NavToggle = () => {
  const { toggleVerticalNav } = useVerticalNav()
  const { isBreakpointReached } = useHorizontalNav()

  const handleClick = () => {
    toggleVerticalNav()
  }

  return (
    <>
      {isBreakpointReached && <i className='ri-menu-line cursor-pointer' onClick={handleClick} />}
    </>
  )
}

export default NavToggle
