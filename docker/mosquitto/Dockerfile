FROM eclipse-mosquitto:2

# Generate hashed password file at build time (credentials from build args, no defaults)
ARG MQTT_USER
ARG MQTT_PASSWORD
RUN mosquitto_passwd -b -c /mosquitto/config/passwd "${MQTT_USER}" "${MQTT_PASSWORD}" \
    && chmod 644 /mosquitto/config/passwd

COPY mosquitto.conf /mosquitto/config/mosquitto.conf
