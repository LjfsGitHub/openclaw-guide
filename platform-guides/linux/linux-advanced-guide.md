# OpenClaw Linux平台高级指南

## 作者：OpenClaw Guide
## 版本：1.0
## 发布日期：2026年2月24日
## 分类：Linux平台/企业级

---

## 📖 目录

1. [Linux平台选择](#linux平台选择)
2. [容器化部署](#容器化部署)
3. [高可用架构](#高可用架构)
4. [安全加固](#安全加固)
5. [性能调优](#性能调优)
6. [监控告警](#监控告警)
7. [自动化运维](#自动化运维)

---

## 1. Linux平台选择

### 1.1 发行版推荐
```yaml
企业推荐:
  生产环境:
    - Ubuntu LTS (22.04/24.04): 社区支持好，文档丰富
    - RHEL/CentOS Stream: 企业级支持，稳定性高
    - Debian Stable: 稳定性极佳，安全更新及时
  
  开发环境:
    - Fedora: 新技术支持好
    - Arch Linux: 滚动更新，定制性强
  
  容器环境:
    - Alpine Linux: 轻量级，适合容器
    - Ubuntu Minimal: 平衡性能和功能
```

### 1.2 硬件要求
```bash
# 检查系统硬件
lscpu                    # CPU信息
free -h                  # 内存信息
df -h                    # 磁盘信息
lspci | grep -i vga      # 显卡信息（如果需要GPU加速）

# 企业级硬件建议
CPU: 4+ 核心 (推荐8+)
内存: 8GB+ (推荐16GB+)
存储: 100GB+ SSD (推荐NVMe)
网络: 1Gbps+ (推荐10Gbps内网)
```

---

## 2. 容器化部署

### 2.1 Docker Compose部署
```yaml
# docker-compose-production.yml
version: '3.8'

services:
  # OpenClaw Gateway集群
  gateway:
    image: openclaw/gateway:latest
    container_name: openclaw-gateway
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "3001:3001"  # WebSocket
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://openclaw:${DB_PASSWORD}@postgres:5432/openclaw
      - LOG_LEVEL=info
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./config:/app/config
    depends_on:
      - redis
      - postgres
    networks:
      - openclaw-network
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Redis集群
  redis:
    image: redis:7-alpine
    container_name: openclaw-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    networks:
      - openclaw-network
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  # PostgreSQL数据库
  postgres:
    image: postgres:15-alpine
    container_name: openclaw-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: openclaw
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: openclaw
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=C"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - openclaw-network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U openclaw"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Nginx反向代理
  nginx:
    image: nginx:alpine
    container_name: openclaw-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      - gateway
    networks:
      - openclaw-network
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M

  # 监控系统
  prometheus:
    image: prom/prometheus:latest
    container_name: openclaw-prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - openclaw-network
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=30d'

  grafana:
    image: grafana/grafana:latest
    container_name: openclaw-grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    ports:
      - "3001:3000"
    networks:
      - openclaw-network
    depends_on:
      - prometheus

networks:
  openclaw-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  redis-data:
    driver: local
  postgres-data:
    driver: local
  prometheus-data:
    driver: local
  grafana-data:
    driver: local
```

### 2.2 Kubernetes部署
```yaml
# openclaw-kubernetes.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: openclaw
---
# ConfigMap for configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: openclaw-config
  namespace: openclaw
data:
  config.yaml: |
    server:
      port: 3000
      host: 0.0.0.0
    database:
      type: postgres
      host: postgres.openclaw.svc.cluster.local
      port: 5432
      name: openclaw
      username: openclaw
    redis:
      host: redis.openclaw.svc.cluster.local
      port: 6379
    logging:
      level: info
      format: json
---
# Secrets
apiVersion: v1
kind: Secret
metadata:
  name: openclaw-secrets
  namespace: openclaw
type: Opaque
data:
  db-password: $(echo -n "your-db-password" | base64)
  redis-password: $(echo -n "your-redis-password" | base64)
  jwt-secret: $(echo -n "your-jwt-secret" | base64)
---
# PostgreSQL StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: openclaw
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: openclaw-secrets
              key: db-password
        - name: POSTGRES_USER
          value: "openclaw"
        - name: POSTGRES_DB
          value: "openclaw"
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - sh
            - -c
            - exec pg_isready -U openclaw
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - sh
            - -c
            - exec pg_isready -U openclaw
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
---
# Redis Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: openclaw
spec:
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command: ["redis-server"]
        args: ["--appendonly", "yes", "--requirepass", "$(REDIS_PASSWORD)"]
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: openclaw-secrets
              key: redis-password
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-data
          mountPath: /data
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 15
          periodSeconds: 20
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 10
      volumes:
      - name: redis-data
        emptyDir: {}
---
# OpenClaw Gateway Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openclaw-gateway
  namespace: openclaw
spec:
  replicas: 3
  selector:
    matchLabels:
      app: openclaw-gateway
  template:
    metadata:
      labels:
        app: openclaw-gateway
    spec:
      containers:
      - name: gateway
        image: openclaw/gateway:latest
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          value: "postgresql://openclaw:$(DB_PASSWORD)@postgres.openclaw.svc.cluster.local:5432/openclaw"
        - name: REDIS_URL
          value: "redis://:$(REDIS_PASSWORD)@redis.openclaw.svc.cluster.local:6379"
        envFrom:
        - secretRef:
            name: openclaw-secrets
        ports:
        - containerPort: 3000
        volumeMounts:
        - name: config
          mountPath: /app/config
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: openclaw-config
---
# Services
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: openclaw
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: openclaw
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: openclaw-gateway
  namespace: openclaw
spec:
  selector:
    app: openclaw-gateway
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
---
# Ingress for external access
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: openclaw-ingress
  namespace: openclaw
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - openclaw.example.com
    secretName: openclaw-tls
  rules:
  - host: openclaw.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: openclaw-gateway
            port:
              number: 3000
---
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: openclaw-gateway-hpa
  namespace: openclaw
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: openclaw-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
