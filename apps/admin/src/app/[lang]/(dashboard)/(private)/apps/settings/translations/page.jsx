'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import classnames from 'classnames';

/* MUI */
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';

/* Dialog */
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

/* Toast */
import { toast } from 'react-toastify';

/* Tanstack */
import { rankItem } from '@tanstack/match-sorter-utils';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/react-table';

import tableStyles from '@core/styles/table.module.css';

const fuzzyFilter = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value);
  addMeta({ itemRank });
  return itemRank.passed;
};

const DebouncedInput = ({ value: initialValue, onChange, debounce = 500, ...props }) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);
    return () => clearTimeout(timeout);
  }, [value, onChange, debounce]);

  return <TextField {...props} value={value} onChange={e => setValue(e.target.value)} size='small' />;
};

const columnHelper = createColumnHelper();

const TranslationsPage = () => {
  const router = useRouter();
  const [rowSelection, setRowSelection] = useState({});
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  
  /* Modals */
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  /* Edit/Delete State */
  const [translationToEdit, setTranslationToEdit] = useState(null);
  
  /* Form State */
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    category: 'general',
    description: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);

      const [translationsRes, categoriesRes] = await Promise.all([
        fetch(`http://localhost:3082/api/admin/settings/translations?${params}`),
        fetch('http://localhost:3082/api/admin/settings/translations/categories')
      ]);

      const translationsData = await translationsRes.json();
      const categoriesData = await categoriesRes.json();

      if (translationsData.success) {
        setData(translationsData.data?.translations || []);
      } else {
        setData([]);
      }

      if (categoriesData.success) {
        setCategories(categoriesData.data || []);
      } else {
        setCategories([]);
      }

    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      toast.error('Veriler yüklenirken hata oluştu');
      setData([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter]);

  const getCategoryBadge = (category) => {
    const badges = {
      general: { label: 'Genel', color: 'default' },
      form: { label: 'Form', color: 'primary' },
      menu: { label: 'Menü', color: 'success' },
      message: { label: 'Mesaj', color: 'info' },
      product: { label: 'Ürün', color: 'warning' },
      other: { label: 'Diğer', color: 'default' }
    };
    return badges[category] || { label: category, color: 'default' };
  };

  const handleAddClick = () => {
    setFormData({
      key: '',
      value: '',
      category: 'general',
      description: ''
    });
    setAddModalOpen(true);
  };

  const handleEditClick = (translation) => {
    setTranslationToEdit(translation);
    setFormData({
      key: translation.key,
      value: translation.value,
      category: translation.category,
      description: translation.description || ''
    });
    setEditModalOpen(true);
  };



  const handleAddSubmit = async () => {
    if (!formData.key.trim() || !formData.value.trim()) {
      toast.error('Anahtar ve değer zorunludur');
      return;
    }

    try {
      const response = await fetch('http://localhost:3082/api/admin/settings/translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Çeviri başarıyla eklendi');
        setAddModalOpen(false);
        loadData();
      } else {
        toast.error(result.message || 'Ekleme başarısız');
      }
    } catch (error) {
      toast.error('Ekleme sırasında hata oluştu');
    }
  };

  const handleEditSubmit = async () => {
    if (!translationToEdit || !formData.value.trim()) {
      toast.error('Değer zorunludur');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3082/api/admin/settings/translations/${translationToEdit._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Çeviri başarıyla güncellendi');
        setEditModalOpen(false);
        setTranslationToEdit(null);
        loadData();
      } else {
        toast.error(result.message || 'Güncelleme başarısız');
      }
    } catch (error) {
      toast.error('Güncelleme sırasında hata oluştu');
    }
  };


  const columns = useMemo(
    () => [
      columnHelper.accessor('key', {
        header: 'Değişken',
        cell: ({ row }) => (
          <div className='flex flex-col'>
            <Typography className='font-medium' color='text.primary'>
              {row.original.key}
            </Typography>
          </div>
        )
      }),
      columnHelper.accessor('value', {
        header: 'Değeri',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {row.original.value}
          </Typography>
        )
      }),
      columnHelper.accessor('category', {
        header: 'Kategori',
        cell: ({ row }) => {
          const badge = getCategoryBadge(row.original.category);
          return (
            <Chip
              label={badge.label}
              color={badge.color}
              size='small'
              variant='tonal'
            />
          );
        }
      }),
      columnHelper.accessor('actions', {
        header: 'İşlemler',
        cell: ({ row }) => (
          <div className='flex items-center'>
            <Tooltip title='Düzenle'>
              <IconButton
                size='small'
                onClick={() => handleEditClick(row.original)}
              >
                <i className='ri-edit-box-line text-[22px] text-textSecondary' />
              </IconButton>
            </Tooltip>
          </div>
        ),
        enableSorting: false
      })
    ],
    []
  );

  const table = useReactTable({
    data: data || [],
    columns,
    filterFns: { fuzzy: fuzzyFilter },
    state: { rowSelection, globalFilter },
    initialState: { pagination: { pageSize: 10 } },
    enableRowSelection: true,
    globalFilterFn: fuzzyFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues()
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Card>
        {/* Header ve Filtreler */}
        <div className='flex flex-col gap-4 p-5'>
          <div className='flex items-start justify-between flex-wrap gap-4'>
            <div className='flex flex-col gap-1'>
              <Typography variant='h5'>Dil Ayarları</Typography>
              <Typography variant='body2' color='text.secondary'>
                Site genelindeki metin çevirilerini yönetin
              </Typography>
            </div>
            <Button
              color='primary'
              variant='contained'
              startIcon={<i className='ri-add-line' />}
              onClick={handleAddClick}
            >
              Yeni Ekle
            </Button>
          </div>

          {/* Filtreler */}
          <div className='flex items-center gap-4 flex-wrap'>
            <DebouncedInput
              value={globalFilter ?? ''}
              onChange={value => setGlobalFilter(String(value))}
              placeholder='Anahtar veya değer ara...'
              className='is-full sm:is-auto'
            />
            <TextField
              select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              size='small'
              className='is-full sm:is-auto min-is-[200px]'
              SelectProps={{
                displayEmpty: true
              }}
            >
              <MenuItem value=''>Tüm Kategoriler</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.name} value={cat.name}>
                  {cat.name} ({cat.count})
                </MenuItem>
              ))}
            </TextField>
          </div>
        </div>

        {/* Tablo */}
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div
                          className={classnames({
                            'flex items-center': header.column.getIsSorted(),
                            'cursor-pointer select-none': header.column.getCanSort()
                          })}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <i className='ri-arrow-up-s-line text-xl' />,
                            desc: <i className='ri-arrow-down-s-line text-xl' />
                          }[header.column.getIsSorted()] ?? null}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            {table.getFilteredRowModel().rows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                    Çeviri Bulunamadı
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {table.getRowModel().rows.slice(0, table.getState().pagination.pageSize).map(row => (
                  <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[10, 15, 25]}
          component='div'
          className='border-bs'
          count={table.getFilteredRowModel().rows.length}
          rowsPerPage={table.getState().pagination.pageSize}
          page={table.getState().pagination.pageIndex}
          onPageChange={(_, page) => table.setPageIndex(page)}
          onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
        />
      </Card>

      {/* Ekleme Dialog */}
      <Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Yeni Çeviri Ekle</DialogTitle>
        <DialogContent>
          <div className='flex flex-col gap-4 pt-2'>
            <TextField
              label='Anahtar'
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              placeholder='ornek_anahtar'
              fullWidth
              required
            />
            <TextField
              label='Değer'
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder='Örnek Değer'
              fullWidth
              required
            />
            <TextField
              select
              label='Kategori'
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              fullWidth
            >
              <MenuItem value='general'>Genel</MenuItem>
              <MenuItem value='form'>Form</MenuItem>
              <MenuItem value='menu'>Menü</MenuItem>
              <MenuItem value='message'>Mesaj</MenuItem>
              <MenuItem value='product'>Ürün</MenuItem>
              <MenuItem value='other'>Diğer</MenuItem>
            </TextField>
            <TextField
              label='Açıklama'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='Bu çevirinin kullanım amacı...'
              multiline
              rows={3}
              fullWidth
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddModalOpen(false)} color='secondary'>
            İptal
          </Button>
          <Button onClick={handleAddSubmit} variant='contained' color='primary'>
            Ekle
          </Button>
        </DialogActions>
      </Dialog>

      {/* Düzenleme Dialog */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Çeviri Düzenle</DialogTitle>
        <DialogContent>
          <div className='flex flex-col gap-4 pt-2'>
            <TextField
              label='Anahtar'
              value={formData.key}
              disabled
              fullWidth
            />
            <TextField
              label='Değer'
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder='Örnek Değer'
              fullWidth
              required
            />
            <TextField
              select
              label='Kategori'
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              fullWidth
            >
              <MenuItem value='general'>Genel</MenuItem>
              <MenuItem value='form'>Form</MenuItem>
              <MenuItem value='menu'>Menü</MenuItem>
              <MenuItem value='message'>Mesaj</MenuItem>
              <MenuItem value='product'>Ürün</MenuItem>
              <MenuItem value='other'>Diğer</MenuItem>
            </TextField>
            <TextField
              label='Açıklama'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='Bu çevirinin kullanım amacı...'
              multiline
              rows={3}
              fullWidth
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)} color='secondary'>
            İptal
          </Button>
          <Button onClick={handleEditSubmit} variant='contained' color='primary'>
            Güncelle
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TranslationsPage;