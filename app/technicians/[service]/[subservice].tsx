import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/axiosConfig';
import { ALL_SUBSERVICES } from '@/constants/Data';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';

interface Technician {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  profilePic?: string;
  experience?: number;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  pricePerHour?: number;
  rating?: number;
}

const FALLBACK_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Homezy-Tech';

function TechnicianCard({ technician, onPress }: { technician: Technician; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image
        source={{ uri: technician.profilePic || FALLBACK_AVATAR }}
        style={styles.avatar}
      />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.name} numberOfLines={1}>{technician.name}</Text>
          <View style={styles.ratingChip}>
            <MaterialIcons name="star" size={14} color={Colors.star} />
            <Text style={styles.ratingText}>{technician.rating ?? 'N/A'}</Text>
          </View>
        </View>
        <Text style={styles.email} numberOfLines={1}>{technician.email}</Text>
        {technician.phone ? (
          <View style={styles.row}>
            <MaterialIcons name="call" size={16} color={Colors.textMuted} />
            <Text style={styles.meta}>{technician.phone}</Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <MaterialIcons name="work" size={16} color={Colors.textMuted} />
          <Text style={styles.meta}>
            {typeof technician.experience === 'number'
              ? `${technician.experience} yrs experience`
              : 'Experience not listed'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TechniciansScreen() {
  const router = useRouter();
  const { service, subservice } = useLocalSearchParams<{ service: string; subservice: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const title = useMemo(() => {
    const serviceText = service ? decodeURIComponent(service) : 'Service';
    const subText = subservice ? decodeURIComponent(subservice) : 'Subservice';
    return `${serviceText} • ${subText}`;
  }, [service, subservice]);

  const servicePayload = useMemo(() => {
    const serviceName = service ? decodeURIComponent(service) : '';
    const subName = subservice ? decodeURIComponent(subservice) : '';
    const list = ALL_SUBSERVICES[serviceName] || [];
    const match = list.find((item) => item.title === subName);

    return match
      ? { ...match, category: serviceName }
      : {
          title: subName,
          price: '',
          rating: '0',
          reviews: '0',
          duration: '',
          img: 'https://images.unsplash.com/photo-1581578731548-c64695ce2958?w=800&q=80',
          tab: 'All',
          category: serviceName,
        };
  }, [service, subservice]);

  useEffect(() => {
    const loadTechnicians = async () => {
      try {
        setLoading(true);
        setError(null);

        const [lat, lng] = await AsyncStorage.multiGet(['@homezy_lat', '@homezy_lng']);
        const latValue = lat?.[1];
        const lngValue = lng?.[1];

        if (!service || !subservice || !latValue || !lngValue) {
          setError('Missing service, subservice, or location details.');
          setTechnicians([]);
          return;
        }

        const serviceParam = encodeURIComponent(String(service));
        const subserviceParam = encodeURIComponent(String(subservice));
        const response = await api.get(
          `/user/${serviceParam}/${subserviceParam}/${latValue}/${lngValue}`
        );

        const payload = response?.data?.data ?? response?.data ?? [];
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.technicians)
          ? payload.technicians
          : [];

        setTechnicians(list);
      } catch (err) {
        console.error('Failed to load technicians:', err);
        setError('Failed to load technicians. Try again.');
      } finally {
        setLoading(false);
      }
    };

    loadTechnicians();
  }, [service, subservice]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.iconSpacer} />
      </View>

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateText}>Finding technicians near you...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateWrap}>
          <MaterialIcons name="error-outline" size={48} color={Colors.border} />
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : technicians.length === 0 ? (
        <View style={styles.stateWrap}>
          <MaterialIcons name="sentiment-dissatisfied" size={48} color={Colors.border} />
          <Text style={styles.stateText}>No technicians available right now.</Text>
        </View>
      ) : (
        <FlatList
          data={technicians}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TechnicianCard
              technician={item}
              onPress={() =>
                router.push({
                  pathname: '/services/[id]',
                  params: {
                    id: servicePayload.title,
                    data: JSON.stringify(servicePayload),
                    tech: JSON.stringify(item),
                  },
                })
              }
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadow.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSpacer: { width: 40 },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.md,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    marginHorizontal: 8,
  },
  list: {
    padding: Spacing.base,
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceAlt,
  },
  cardBody: {
    flex: 1,
    marginLeft: Spacing.base,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: Typography.md,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
  },
  ratingText: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  email: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Medium',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  meta: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.xl,
  },
  stateText: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
