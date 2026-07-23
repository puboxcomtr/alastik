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

interface SearchBoxProps {
    forceShow?: boolean;
    autoFocus?: boolean;
    onClose?: () => void;
}

export default function SearchBox({ forceShow = false, autoFocus = false, onClose }: SearchBoxProps) {
    const anchorRef = React.useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [results, setResults] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (autoFocus && anchorRef.current) {
            anchorRef.current.focus();
        }
    }, [autoFocus]);

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
            <Box sx={{
                position: 'relative',
                display: forceShow ? 'block' : { xs: 'none', md: 'block' },
                width: '100%'
            }}>
                <TextField
                    inputRef={anchorRef}
                    fullWidth
                    placeholder="Ürün Adı, stok kodu veya lastik ebatı ile arama yapabilirsiniz.."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchTerm.length >= 2) {
                            setOpen(false)
                            window.location.href = `/arama?q=${encodeURIComponent(searchTerm)}`
                        }
                    }}
                    onFocus={() => searchTerm.length >= 2 && setOpen(true)}
                    size="small"
                    sx={{
                        '& .MuiOutlinedInput-root': { paddingRight: '5px' },
                        width: forceShow ? '100%' : 533,
                    }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                {loading ? (
                                    <CircularProgress size={20} />
                                ) : (
                                    <IconButton onClick={() => searchTerm.length >= 2 && (window.location.href = `/arama?q=${encodeURIComponent(searchTerm)}`)}>
                                        <i className="ri-search-line" style={{ fontSize: 18, color: '#999' }}></i>
                                    </IconButton>
                                )}
                                {forceShow && onClose && (
                                    <IconButton onClick={onClose} aria-label="Aramayı kapat">
                                        <i className="ri-close-line" style={{ fontSize: 20, color: '#333' }}></i>
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
                    style={{ zIndex: 1300, width: forceShow ? anchorRef.current?.parentElement?.offsetWidth : 533 }}
                >
                    <Paper sx={{ width: forceShow ? '100%' : 533, pt: 1 }}>
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