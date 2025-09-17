"use client";

import { Grid, TextField, MenuItem, Tooltip, Typography, FormControl } from "@mui/material";
import { Offcanvas } from "react-bootstrap";
import { useState } from "react";

export default function TireFilters() {
    /* Input Değiştirme Fonksiyonları */
    const [width, setWidth] = useState("all");
    const [height, setHeight] = useState("all");
    const [rim, setRim] = useState("all");
    const [car, setCar] = useState("all");
    const [loadIndex, setloadIndex] = useState("all");
    const [speedIndex, setspeedIndex] = useState("all");
    return (
        <>
            <Grid container sx={{ borderBottom: "1px solid #ddd" }}>
                {/* Lastik Genişlik */}
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <Offcanvas.Title className="mb-2" as="h6">Taban Genişliği
                        <Tooltip
                            title={
                                <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                    Lastik satın alımınız için doğru lastik ebatını belirlemeniz önemlidir.
                                    Aracınıza takılan lastikler yanak kısmında tüm bilgileri içerir.
                                </Typography>
                            }
                            arrow
                            placement="right">
                            <i
                                className="ri-information-line"
                                style={{ fontSize: 18, cursor: "pointer", color: "#555", marginLeft: 5 }}>
                            </i>
                        </Tooltip>
                    </Offcanvas.Title>
                    <FormControl fullWidth>
                        <TextField
                            select
                            fullWidth
                            label=""
                            size="small"
                            defaultValue="all"
                            variant="outlined"
                            value={width}
                            onChange={(e) => setWidth(e.target.value)}
                            InputLabelProps={{ style: { color: "#000" } }}
                            SelectProps={{
                                MenuProps: {
                                    PaperProps: {
                                        style: {
                                            maxHeight: 200, 
                                            overflowY: "auto",
                                        },
                                    },
                                },
                                IconComponent: (props) => (
                                    <i
                                        {...props}
                                        className="ri-arrow-down-s-line"
                                        style={{ color: "#555", fontSize: 20 }}
                                    />
                                ),
                            }}
                            sx={{
                                backgroundColor: "#f5f5f5",
                                borderRadius: 1,
                                border: "transparent",
                            }}
                        >
                            <MenuItem value="all">Tümü</MenuItem>
                            <MenuItem value="195">195</MenuItem>
                            <MenuItem value="205">205</MenuItem>
                        </TextField>
                    </FormControl>
                </Grid>
                {/* Yanak Yükseklik */}
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <Offcanvas.Title className="mb-2" as="h6">Yanak Yüksekliği
                        <Tooltip
                            title={
                                <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                    Lastik satın alımınız için doğru lastik ebatını belirlemeniz önemlidir.
                                    Aracınıza takılan lastikler yanak kısmında tüm bilgileri içerir.
                                </Typography>
                            }
                            arrow
                            placement="right">
                            <i
                                className="ri-information-line"
                                style={{ fontSize: 18, cursor: "pointer", color: "#555", marginLeft: 5 }}>
                            </i>
                        </Tooltip>
                    </Offcanvas.Title>
                    <FormControl fullWidth>
                        <TextField
                            select
                            fullWidth
                            label=""
                            size="small"
                            defaultValue="all"
                            variant="outlined"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            InputLabelProps={{ style: { color: "#000" } }}
                            SelectProps={{
                                IconComponent: (props) => (
                                    <i
                                        {...props}
                                        className="ri-arrow-down-s-line"
                                        style={{ color: "#555", fontSize: 20 }}
                                    />
                                ),
                            }}
                            sx={{
                                backgroundColor: "#f5f5f5",
                                borderRadius: 1,
                                border: "transparent",
                            }}
                        >
                            <MenuItem value="all">Tümü</MenuItem>
                            <MenuItem value="55">55</MenuItem>
                            <MenuItem value="60">60</MenuItem>
                        </TextField>
                    </FormControl>
                </Grid>
                {/* Jant Çapı */}
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <Offcanvas.Title className="mb-2" as="h6">Jant Çapı

                        <Tooltip
                            title={
                                <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                    Lastik satın alımınız için doğru lastik ebatını belirlemeniz önemlidir.
                                    Aracınıza takılan lastikler yanak kısmında tüm bilgileri içerir.
                                </Typography>
                            }
                            arrow
                            placement="right">
                            <i
                                className="ri-information-line"
                                style={{ fontSize: 18, cursor: "pointer", color: "#555", marginLeft: 5 }}>
                            </i>
                        </Tooltip>
                    </Offcanvas.Title>
                    <FormControl fullWidth>
                        <TextField
                            select
                            fullWidth
                            label=""
                            size="small"
                            defaultValue="all"
                            variant="outlined"
                            value={rim}
                            onChange={(e) => setRim(e.target.value)}
                            InputLabelProps={{ style: { color: "#000" } }}
                            SelectProps={{
                                IconComponent: (props) => (
                                    <i
                                        {...props}
                                        className="ri-arrow-down-s-line"
                                        style={{ color: "#555", fontSize: 20 }}
                                    />
                                ),
                            }}
                            sx={{
                                backgroundColor: "#f5f5f5",
                                borderRadius: 1,
                                border: "transparent",
                            }}
                        >
                            <MenuItem value="all">Tümü</MenuItem>
                            <MenuItem value="15">R15</MenuItem>
                            <MenuItem value="16">R16</MenuItem>
                        </TextField>
                    </FormControl>
                </Grid>
                {/* Araç Tipi */}
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <Offcanvas.Title className="mb-2" as="h6">Araç Tipi</Offcanvas.Title>
                    <FormControl fullWidth>
                        <TextField
                            select
                            fullWidth
                            label=""
                            size="small"
                            defaultValue="all"
                            variant="outlined"
                            value={car}
                            onChange={(e) => setCar(e.target.value)}
                            InputLabelProps={{ style: { color: "#000" } }}
                            SelectProps={{
                                IconComponent: (props) => (
                                    <i
                                        {...props}
                                        className="ri-arrow-down-s-line"
                                        style={{ color: "#555", fontSize: 20 }}
                                    />
                                ),
                            }}
                            sx={{
                                backgroundColor: "#f5f5f5",
                                borderRadius: 1,
                                border: "transparent",
                            }}
                        >
                            <MenuItem value="all">Tümü</MenuItem>
                            <MenuItem value="0">Otomobil</MenuItem>
                            <MenuItem value="1">4x4 (Suv)</MenuItem>
                            <MenuItem value="2">Hafif Ticari</MenuItem>
                            <MenuItem value="3">Kamyonet</MenuItem>
                        </TextField>
                    </FormControl>
                </Grid>
                {/* Yük Endeksi */}
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <Offcanvas.Title className="mb-2" as="h6">
                        Yük Endeksi
                        <Tooltip
                            title={
                                <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                    Lastik yanaklarında yük endeksi kodlanmış bir sayı olarak gösterilir. Yük endeksi (taşıma kapasitesi endeksi), bir lastiğin taşıyabileceği azami izin verilen yükü ifade eder. Daha yüksek yük endeksine (= daha büyük sayı) sahip bir lastiğin takılması her zaman mümkündür.
                                </Typography>
                            }
                            arrow
                            placement="right">
                            <i
                                className="ri-information-line"
                                style={{ fontSize: 18, cursor: "pointer", color: "#555", marginLeft: 5 }}>
                            </i>
                        </Tooltip>
                    </Offcanvas.Title>
                    <FormControl fullWidth>
                        <TextField
                            select
                            fullWidth
                            label=""
                            size="small"
                            defaultValue="all"
                            variant="outlined"
                            value={loadIndex}
                            onChange={(e) => setloadIndex(e.target.value)}
                            InputLabelProps={{ style: { color: "#000" } }}
                            SelectProps={{
                                IconComponent: (props) => (
                                    <i
                                        {...props}
                                        className="ri-arrow-down-s-line"
                                        style={{ color: "#555", fontSize: 20 }}
                                    />
                                ),
                            }}
                            sx={{
                                backgroundColor: "#f5f5f5",
                                borderRadius: 1,
                                border: "transparent",
                            }}
                        >
                            <MenuItem value="all">Tümü</MenuItem>
                            <MenuItem value="99">99</MenuItem>
                            <MenuItem value="100">100</MenuItem>
                            <MenuItem value="101">101</MenuItem>
                            <MenuItem value="102">102</MenuItem>
                            <MenuItem value="103">103</MenuItem>
                            <MenuItem value="104">104</MenuItem>
                            <MenuItem value="105">105</MenuItem>
                        </TextField>
                    </FormControl>
                </Grid>
                {/* Hız Endeksi */}
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <Offcanvas.Title className="mb-2" as="h6">
                        Hız Endeksi
                        <Tooltip
                            title={
                                <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                    Hız endeksi, lastiğin en fazla hangi hızda kullanılabileceğini gösterir. Daha yüksek endekslere sahip lastikler elbette kullanılabilir.
                                    Kış lastikleri için istisna: Daha düşük hız endeksine sahip lastiklerin kullanılması mümkündür, ancak bu durumda sürücünün görüş alanında, lastiğin izin verilen azami hızını gösteren açıkça görülebilir bir etiket bulunmalıdır. Bu durumda sürücü, izin verilen azami hızı aşmamalıdır.
                                </Typography>
                            }
                            arrow
                            placement="right">
                            <i
                                className="ri-information-line"
                                style={{ fontSize: 18, cursor: "pointer", color: "#555", marginLeft: 5 }}>
                            </i>
                        </Tooltip>
                    </Offcanvas.Title>
                    <FormControl fullWidth>
                        <TextField
                            select
                            fullWidth
                            label=""
                            size="small"
                            defaultValue="all"
                            variant="outlined"
                            value={speedIndex}
                            onChange={(e) => setspeedIndex(e.target.value)}
                            InputLabelProps={{ style: { color: "#000" } }}
                            SelectProps={{
                                IconComponent: (props) => (
                                    <i
                                        {...props}
                                        className="ri-arrow-down-s-line"
                                        style={{ color: "#555", fontSize: 20 }}
                                    />
                                ),
                            }}
                            sx={{
                                backgroundColor: "#f5f5f5",
                                borderRadius: 1,
                                border: "transparent",
                            }}
                        >
                            <MenuItem value="all">Tümü</MenuItem>
                            <MenuItem value="A">A</MenuItem>
                            <MenuItem value="B">B</MenuItem>
                            <MenuItem value="C">C</MenuItem>
                            <MenuItem value="D">D</MenuItem>
                            <MenuItem value="E">E</MenuItem>
                            <MenuItem value="F">F</MenuItem>
                            <MenuItem value="G">G</MenuItem>
                        </TextField>
                    </FormControl>
                </Grid>

            </Grid>
        </>
    );
}
