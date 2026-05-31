FROM eclipse-mosquitto:2

COPY mosquitto.conf /mosquitto/config/mosquitto.conf

# Створення файлу паролів для авторизації IoT-пристроїв
RUN mosquitto_passwd -b -c /mosquitto/config/passwd smartenergy SmartEnergy2024 && \
    mosquitto_passwd -b    /mosquitto/config/passwd subscriber SmartEnergy2024 && \
    chown mosquitto:mosquitto /mosquitto/config/passwd && \
    chmod 0600 /mosquitto/config/passwd
