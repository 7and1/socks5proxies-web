package main

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/getsentry/sentry-go"
	sentrygin "github.com/getsentry/sentry-go/gin"
	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"

	"socksproxies.com/server/internal/config"
)

type Observability struct {
	SentryMiddleware gin.HandlerFunc
	OTelMiddleware   gin.HandlerFunc
	PanicNotifier    func(*gin.Context, any)
	Alert            func(event string, meta map[string]any, err error)
	Shutdown         func(context.Context) error
	Flush            func()
}

func InitObservability(cfg config.Config) Observability {
	obs := Observability{
		Shutdown: func(context.Context) error { return nil },
	}

	if cfg.SentryDSN != "" {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:              cfg.SentryDSN,
			Environment:      cfg.Environment,
			TracesSampleRate: cfg.SentryTracesSampleRate,
			AttachStacktrace: true,
		}); err != nil {
			log.Printf("sentry init failed: %v", err)
		} else {
			obs.SentryMiddleware = sentrygin.New(sentrygin.Options{Repanic: true})
			obs.PanicNotifier = func(c *gin.Context, r any) {
				if hub := sentrygin.GetHubFromContext(c); hub != nil {
					hub.Recover(r)
					hub.Flush(2 * time.Second)
					return
				}
				sentry.CaptureException(fmt.Errorf("%v", r))
			}
			obs.Alert = func(event string, meta map[string]any, err error) {
				sentry.WithScope(func(scope *sentry.Scope) {
					scope.SetTag("event", event)
					for key, value := range meta {
						scope.SetExtra(key, value)
					}
					if err != nil {
						sentry.CaptureException(err)
					} else {
						sentry.CaptureMessage(event)
					}
				})
			}
			obs.Flush = func() {
				sentry.Flush(2 * time.Second)
			}
		}
	}

	if cfg.OTelEndpoint != "" {
		endpoint := strings.TrimPrefix(cfg.OTelEndpoint, "https://")
		endpoint = strings.TrimPrefix(endpoint, "http://")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		opts := []otlptracegrpc.Option{
			otlptracegrpc.WithEndpoint(endpoint),
		}
		if cfg.OTelInsecure {
			opts = append(opts, otlptracegrpc.WithInsecure())
		}

		exporter, err := otlptracegrpc.New(ctx, opts...)
		if err != nil {
			log.Printf("otel exporter init failed: %v", err)
		} else {
			res, resErr := resource.New(ctx,
				resource.WithAttributes(
					semconv.ServiceName(cfg.OTelServiceName),
					semconv.DeploymentEnvironmentKey.String(cfg.Environment),
				),
			)
			if resErr != nil {
				log.Printf("otel resource init failed: %v", resErr)
			}

			tp := sdktrace.NewTracerProvider(
				sdktrace.WithBatcher(exporter),
				sdktrace.WithResource(res),
			)
			otel.SetTracerProvider(tp)
			otel.SetTextMapPropagator(
				propagation.NewCompositeTextMapPropagator(
					propagation.TraceContext{},
					propagation.Baggage{},
				),
			)

			obs.OTelMiddleware = otelgin.Middleware(cfg.OTelServiceName)
			obs.Shutdown = tp.Shutdown
		}
	}

	return obs
}
