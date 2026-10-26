# La API (Space de Hugging Face, ver despliegue/). Se construye desde la raíz del repositorio (necesita datos/):
#   docker build -f api/Dockerfile .
FROM eclipse-temurin:25-jdk AS build
WORKDIR /src
COPY datos datos
COPY api/.mvn api/.mvn
COPY api/mvnw api/pom.xml api/
RUN cd api && sh mvnw -B -q dependency:go-offline
COPY api/src api/src
RUN cd api && sh mvnw -B -q package -DskipTests

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /src/api/target/alertas-*.jar app.jar
# Poca memoria y arranque rápido: un recolector sencillo y poca pila
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k"
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
