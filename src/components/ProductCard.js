/**
 * Kartu produk katalog.
 *
 * Thumbnail memakai gambar dari `image_url` bila ada. Jika kosong atau gagal
 * dimuat, tampilannya jatuh ke kotak berwarna per kategori. Ini satu-satunya
 * tempat emoji dipakai di aplikasi, yaitu sebagai gambar pengganti, bukan
 * hiasan pada teks.
 */

import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Chip } from './ui';
import { categoryVisual } from '../lib/catalog';
import { formatRupiah } from '../lib/format';
import { colors, radius, space } from '../theme';

const THUMB = 64;

export default function ProductCard({
  product,
  quantityInCart = 0,
  onAdd,
  onPress,
  disabled,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const visual = categoryVisual(product.category);
  const showImage = Boolean(product.image_url) && !imageFailed;
  const soldOut = product.stock !== null && product.stock !== undefined && product.stock <= 0;
  const unavailable = disabled || soldOut || !product.is_active;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${product.name}, ${formatRupiah(product.price)}`}
      style={({ pressed }) => [styles.card, pressed && onPress && { opacity: 0.9 }]}
    >
      <View style={styles.top}>
        {showImage ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.thumb}
            onError={() => setImageFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View
            style={[styles.thumb, styles.thumbFallback, { backgroundColor: visual.tint }]}
            // Gambar pengganti tidak membawa informasi baru, jadi disembunyikan
            // dari pembaca layar agar nama produk tidak terbaca dua kali.
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={styles.thumbGlyph}>{visual.glyph}</Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.category} numberOfLines={1}>
            {product.category}
          </Text>
          <Text style={styles.price}>{formatRupiah(product.price)}</Text>
        </View>
      </View>

      {Boolean(product.description) && (
        <Text style={styles.description} numberOfLines={3}>
          {product.description}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.status}>
          {soldOut ? (
            <Chip label="Kuota habis hari ini" tone="danger" />
          ) : product.stock !== null && product.stock !== undefined ? (
            <Chip label={`Tersisa ${product.stock} unit`} tone="info" />
          ) : (
            <Chip label="Tersedia" tone="success" />
          )}
        </View>

        {quantityInCart > 0 ? (
          <View style={styles.inCart}>
            <Text style={styles.inCartText}>{quantityInCart} di keranjang</Text>
            <Button
              label="Tambah"
              size="sm"
              tone="secondary"
              onPress={onAdd}
              disabled={unavailable}
              accessibilityLabel={`Tambah satu ${product.name} ke keranjang`}
            />
          </View>
        ) : (
          <Button
            label={unavailable ? 'Tidak tersedia' : 'Tambah ke keranjang'}
            size="sm"
            onPress={onAdd}
            disabled={unavailable}
            accessibilityLabel={`Tambahkan ${product.name} ke keranjang`}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.md,
  },
  top: {
    flexDirection: 'row',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbGlyph: {
    fontSize: 30,
  },
  info: {
    flex: 1,
    marginLeft: space.md,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  category: {
    marginTop: 2,
    fontSize: 12,
    color: colors.inkMuted,
  },
  price: {
    marginTop: space.xs + 2,
    fontSize: 17,
    fontWeight: '700',
    color: colors.turquoise,
  },
  description: {
    marginTop: space.md,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
  },
  footer: {
    marginTop: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  status: {
    flexShrink: 1,
    paddingRight: space.sm,
    marginBottom: space.xs,
  },
  inCart: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inCartText: {
    marginRight: space.sm,
    fontSize: 12,
    fontWeight: '600',
    color: colors.ocean,
  },
});
