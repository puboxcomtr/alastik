'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Popper from '@mui/material/Popper';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import CircularProgress from '@mui/material/CircularProgress';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { api } from '@src/lib/api';

const TYPE_LABELS = {
    tag: 'Etiket',
    product: 'Ürün',
    category: 'Kategori',
    brand: 'Marka'
};

export default function SearchBox() {
    const anchorRef = React.useRef(null);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [results, setResults] = React.useState([]);

    React.useEffect(() => {
        if (!searchTerm || searchTerm.length < 2) {
            setResults([]);
            setOpen(false);
            return;
        }

        setLoading(true);
        const timer = setTimeout(async () => {
            const data = await api.searchAutocomplete(searchTerm, 10);
            if (data.success) {
                setResults(data.data || []);
                setOpen(true);
            }
            setLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleClickAway = () => setOpen(false);

    const handleResultClick = async (url: string) => {
        await api.trackSearch(searchTerm);
        setOpen(false);
        window.location.href = url;
    };

    return (
        <ClickAwayListener onClickAway={handleClickAway}>
            <Box sx={{ position: 'relative', display: { xs: 'none', md: 'block' } }}>
                <TextField
                    inputRef={anchorRef}
                    fullWidth
                    placeholder="Ürün Adı, stok kodu veya lastik ebatı ile arama yapabilirsiniz.."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => searchTerm.length >= 2 && setOpen(true)}
                    size="small"
                    sx={{
                        '& .MuiOutlinedInput-root': { paddingRight: '5px' },
                        width: 533,
                    }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                {loading ? (
                                    <CircularProgress size={20} />
                                ) : (
                                    <IconButton disabled>
                                        <i className="ri-search-line" style={{ fontSize: 18, color: '#999' }}></i>
                                    </IconButton>
                                )}
                            </InputAdornment>
                        ),
                    }}
                />

                <Popper
                    open={open && results.length > 0}
                    anchorEl={anchorRef.current}
                    placement="bottom-start"
                    style={{ zIndex: 1300 }}
                >
                    <Paper sx={{ width: 533, pt: 1 }}>
                        <List component="ul" sx={{ p: 0 }}>
                            {results.map((item, idx) => (
                                <li key={idx}>
                                    <ListItemButton
                                        onClick={() => handleResultClick(item.url)}
                                        sx={{
                                            color: '#333d4c',
                                            py: 1,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            '&:hover': { backgroundColor: '#f5f5f5' }
                                        }}
                                    >
                                        <Typography variant="body2" sx={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            maxWidth: '400px'
                                        }}
                                        >
                                            {item.title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {TYPE_LABELS[item.type]}
                                        </Typography>
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