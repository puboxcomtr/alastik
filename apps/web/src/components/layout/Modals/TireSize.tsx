'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Typography, Box } from '@mui/material';
import Image from "next/image";

export default function TireSize() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handleOpen = () => setOpen(true);
        window.addEventListener('openTireSizeModal', handleOpen);
        return () => window.removeEventListener('openTireSizeModal', handleOpen);
    }, []);

    return (
        <Dialog
            open={open}
            onClose={() => setOpen(false)}
            maxWidth="md"
            fullWidth
            sx={{
                '& .MuiDialog-container': {
                    alignItems: 'center'
                }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Lastik Ebatımı Nasıl Öğrenebilirim?</Typography>
                    <IconButton
                        onClick={() => setOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <i className="ri-close-line"></i>
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent dividers sx={{ maxHeight: '650px', overflowY: 'auto' }}>
                <Typography className='mb-3' variant="body2">
                    <strong>ALastik.com</strong>'dan lastik satın alırken ihtiyacınız olan doğru lastik ebatını kolayca kendiniz öğrenebilirsiniz. Aracınızda takılı olan lastiklerin yan yüzeyinde ihtiyacınız olan tüm bilgiler yer almaktadır.
                </Typography>
                <Image
                    src={'/assets/img/alastik-lastik-ebati-ogrenme.jpg'}
                    alt={'Lastik ebatı nasıl öğrenilir - ALastik.com'}
                    width={800}
                    height={400}
                    className="w-100 h-auto mb-2"
                    style={{ objectFit: 'contain' }}
                />
                <Typography className='mb-2' variant="body2" color="text.secondary">
                    Görseldeki lastik 205/55R16 ebatındadır; yük endeksi 91 ve hız endeksi H'dir. Daha yüksek yük endeksine (örneğin 95 gibi daha büyük bir değer) veya daha yüksek hız endeksine (alfabetik sırayla yukarı, örneğin V) sahip lastikleri de kullanabilirsiniz.
                </Typography>
                <Typography className='mb-2' variant="body2">
                    <strong>Dikkat:</strong> Yaz ve kış lastiklerinizin ebatları farklı olabilir. Bu nedenle doğru lastik ebatını, ilgili mevsimde kullandığınız lastikler üzerinden kontrol edin.
                </Typography>
                <Typography variant='body2'>Hız endeksi, lastiğin dayanabileceği maksimum hızı gösterir. Daha yüksek endeksli lastikler de kullanılabilir.</Typography>
                <Typography variant="subtitle2" className="mt-4 mb-2">Hız Endeksi Tablosu</Typography>
                <div className="table-responsive">
                    <table className="table table-bordered table-sm align-middle w-100 mb-0" style={{ fontSize: '13px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f5f5f5' }}>
                                <th className="text-center">Hız Endeksi</th>
                                <th className="text-center">Maks. Hız (km/s)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                ['A8', '40'], ['B', '50'], ['C', '60'], ['D', '65'], ['E', '70'],
                                ['F', '80'], ['G', '90'], ['J', '100'], ['K', '110'], ['L', '120'],
                                ['M', '130'], ['N', '140'], ['P', '150'], ['Q', '160'], ['R', '170'],
                                ['S', '180'], ['T', '190'], ['U', '200'], ['H', '210'], ['(V)', '>210'],
                                ['V', '240'], ['(W)', '>240'], ['W', '270'], ['Y', '300'], ['(Y)', '>300'],
                                ['ZR', '>240']
                            ].map(([index, speed]) => (
                                <tr key={index}>
                                    <td className="text-center fw-medium">{index}</td>
                                    <td className="text-center">{speed}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Typography variant="body2" className="mt-2 mb-2">Yük endeksi (Lastindex veya Tragfähigkeitsindex olarak da bilinir), araç lastiklerinde lastik başına izin verilen maksimum yükü belirtir.</Typography>
                <Typography variant="subtitle2" className="mt-4 mb-2">Yük Endeksi Tablosu</Typography>
                <div className="table-responsive">
                    <table className="table table-bordered table-sm align-middle w-100 mb-0" style={{ fontSize: '13px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#bebebe' }}>
                                <th className="text-center">Endeks</th>
                                <th className="text-center">Yük (kg)</th>
                                <th className="text-center">Endeks</th>
                                <th className="text-center">Yük (kg)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                [19, 77.5, 71, 345], [20, 80, 72, 355], [21, 82.5, 73, 365], [22, 85, 74, 375],
                                [23, 87.5, 75, 387], [24, 90, 76, 400], [25, 92.5, 77, 412], [26, 95, 78, 425],
                                [27, 97.5, 79, 437], [28, 100, 80, 450], [29, 103, 81, 462], [30, 106, 82, 475],
                                [31, 109, 83, 487], [32, 112, 84, 500], [33, 115, 85, 515], [34, 118, 86, 530],
                                [35, 121, 87, 545], [36, 125, 88, 560], [37, 128, 89, 580], [38, 132, 90, 600],
                                [39, 136, 91, 615], [40, 140, 92, 630], [41, 145, 93, 650], [42, 150, 94, 670],
                                [43, 155, 95, 690], [44, 160, 96, 710], [45, 165, 97, 730], [46, 170, 98, 750],
                                [47, 175, 99, 775], [48, 180, 100, 800], [49, 185, 101, 825], [50, 190, 102, 850],
                                [51, 195, 103, 875], [52, 200, 104, 900], [53, 206, 105, 925], [54, 212, 106, 950],
                                [55, 218, 107, 975], [56, 224, 108, 1000], [57, 230, 109, 1030], [58, 236, 110, 1060],
                                [59, 243, 111, 1090], [60, 250, 112, 1120], [61, 257, 113, 1150], [62, 265, 114, 1180],
                                [63, 272, 115, 1215], [64, 280, 116, 1250], [65, 290, 117, 1285], [66, 300, 118, 1320],
                                [67, 307, 119, 1360], [68, 315, 120, 1400], [69, 325, 121, 1450], [70, 335, 122, 1500]
                            ].map(([i1, w1, i2, w2], idx) => (
                                <tr key={idx}>
                                    <td className="text-center fw-medium">{i1}</td>
                                    <td className="text-center">{w1}</td>
                                    <td className="text-center fw-medium">{i2}</td>
                                    <td className="text-center">{w2}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </DialogContent>
        </Dialog>
    );
}