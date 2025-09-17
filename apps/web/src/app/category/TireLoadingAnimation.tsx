import React from 'react';
import styles from './category.module.css';

interface TireLoadingAnimationProps {
  message?: string;
  subMessage?: string;
}

const TireLoadingAnimation: React.FC<TireLoadingAnimationProps> = ({ 
  message = "Lastikler yükleniyor...", 
  subMessage = "Dia stok bilgileri kontrol ediliyor" 
}) => {
  return (
    <div className={styles.tireLoadingContainer}>
      <div className={styles.tireLoadingAnimation}>
        <div className={styles.tireIcon}>🛞</div>
        <div className={styles.tireIcon}>🛞</div>
        <div className={styles.tireIcon}>🛞</div>
        <div className={styles.tireIcon}>🛞</div>
        <div className={styles.tireIcon}>🛞</div>
      </div>
      
      <div className={styles.loadingText}>
        {message}
      </div>
      
      <div className={styles.loadingSubtext}>
        {subMessage}
      </div>
    </div>
  );
};

export default TireLoadingAnimation; 