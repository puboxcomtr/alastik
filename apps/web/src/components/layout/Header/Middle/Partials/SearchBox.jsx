'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Popper from '@mui/material/Popper';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Divider from '@mui/material/Divider';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import SearchIcon from '@mui/icons-material/Search';


export default function SearchBox({
    searchTerm,
    setSearchTerm,
    onSubmit,
}) {
    const anchorRef = React.useRef(null);
    const [open, setOpen] = React.useState(false);
    React.useEffect(() => {
        if (searchTerm && searchTerm.length > 0) setOpen(false);
    }, [searchTerm]);

    const handleFocus = () => {
        if (!searchTerm) setOpen(true);
    };

    const handleClickAway = () => setOpen(false);

    const handleKeyDown = (e) => {
        // Enter ile submit
        if (e.key === 'Enter') {
            e.preventDefault();
            if (onSubmit) onSubmit(e);
        }
    };
    return (
        <ClickAwayListener onClickAway={handleClickAway}>
            <Box
                component="form"
                onSubmit={onSubmit}
                sx={{ position: 'relative', display: { xs: 'none', md: 'block' } }}
                className="dropdown d-none d-md-block"
            >
                <TextField
                    inputRef={anchorRef}
                    fullWidth
                    placeholder="Ürün Adı, stok kodu veya lastik ebatı ile arama yapabilirsiniz.."
                    aria-label="Ürün Adı, stok kodu veya lastik ebatı ile arama yapabilirsiniz.."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyDown}
                    size="small"
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            paddingRight: '5px',
                        },
                        width: 533,
                    }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton type="submit" aria-label="Ara">
                                    <i className="ri-search-line" style={{ padding: 0, fontSize: 18, color: '#555' }}></i>
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />

                <Popper
                    open={open}
                    anchorEl={anchorRef.current}
                    placement="bottom-start"
                    style={{ zIndex: 1300 }}
                >
                    <Paper sx={{ width: 533, p: 2 }}>
                        <Typography variant="h3" variantMapping={{ h3: 'h3' }} className="mb-2 fs-sm fw-semibold">
                            En Çok Aranan Kelimeler
                        </Typography>
                        <List
                            component="ul"
                            className="border-top d-flex flex-row list-unstyled flex-wrap pt-2"
                            sx={{
                                borderColor: 'divider',
                            }}
                        >
                            {[
                                { href: '/label', text: '22556R16' },
                                { href: '/label', text: '3056517' },
                                { href: '/label', text: 'pirelli yaz' },
                                { href: '/label', text: 'continental lastik' },
                                { href: '/label', text: 'goodyear ultracontact' },
                                { href: '/label', text: '2055517' },
                                { href: '/label', text: '1856515' },
                                { href: '/label', text: 'pirelli 4 mevsim' },
                            ].map((item, idx) => (
                                <li key={idx}>
                                    <ListItemButton
                                        component={Link}
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className="dropdown-item animate-underline animate-target"
                                        sx={{
                                            color: '#333d4c'
                                        }}
                                    >
                                        {item.text}
                                    </ListItemButton>
                                </li>
                            ))}
                        </List>
                        <Typography variant="h3" variantMapping={{ h3: 'h3' }} className="mb-2 fs-sm fw-semibold mt-2">
                            En Çok İncelenen Kelimeler
                        </Typography>
                        <List
                            component="ul"
                            className="border-top d-flex flex-row list-unstyled flex-wrap pt-2"
                            sx={{
                                borderColor: 'divider',
                            }}
                        >
                            {[
                                { href: '/category', text: 'Pirelli' },
                                { href: '/category', text: 'Lassa' },
                                { href: '/category', text: 'Goodyear' },
                                { href: '/category', text: 'Continental' },
                                { href: '/category', text: 'Hankook' },
                                { href: '/category', text: 'Nokian Tyres' },
                                { href: '/category', text: 'Bridgestone' },
                                { href: '/category', text: 'Petlas' },
                            ].map((item, idx) => (
                                <li key={idx}>
                                    <ListItemButton
                                        component={Link}
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className="dropdown-item animate-underline animate-target"
                                        sx={{
                                            color: '#333d4c'
                                        }}
                                    >
                                        {item.text}
                                    </ListItemButton>
                                </li>
                            ))}
                        </List>
                    </Paper>
                </Popper>
            </Box>
        </ClickAwayListener>
    );
}
