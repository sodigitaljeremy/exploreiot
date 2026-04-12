#!/usr/bin/env python3
"""Provision Chirpstack v4 via gRPC API.

Creates a tenant, application, device profile, and 3 devices matching
the ones used by publisher.py for simulation.

Usage:
    python backend/scripts/provision_chirpstack.py

Requires:
    - Chirpstack running on localhost:8080 (or CHIRPSTACK_API_URL)
    - chirpstack-api and grpcio packages installed
"""

import os
import sys
import logging

import grpc
from chirpstack_api import api

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Configuration
CHIRPSTACK_API_URL = os.environ.get("CHIRPSTACK_API_URL", "localhost:8080")
CHIRPSTACK_API_KEY = os.environ.get("CHIRPSTACK_API_KEY", "")

# Devices matching publisher.py
DEVICES = [
    {"dev_eui": "a1b2c3d4e5f60001", "name": "Capteur Bureau 1"},
    {"dev_eui": "a1b2c3d4e5f60002", "name": "Capteur Bureau 2"},
    {"dev_eui": "a1b2c3d4e5f60003", "name": "Capteur Bureau 3"},
]


def get_auth_token():
    """Build gRPC metadata with API key."""
    if CHIRPSTACK_API_KEY:
        return [("authorization", f"Bearer {CHIRPSTACK_API_KEY}")]
    return []


def provision():
    """Create tenant, application, device profile, and devices in Chirpstack."""
    channel = grpc.insecure_channel(CHIRPSTACK_API_URL)
    auth = get_auth_token()

    # --- Tenant ---
    tenant_client = api.TenantServiceStub(channel)
    try:
        tenant_req = api.CreateTenantRequest(
            tenant=api.Tenant(
                name="ExploreIOT",
                can_have_gateways=True,
                max_device_count=10,
                max_gateway_count=5,
            )
        )
        tenant_resp = tenant_client.Create(tenant_req, metadata=auth)
        tenant_id = tenant_resp.id
        logger.info("Tenant created: %s", tenant_id)
    except grpc.RpcError as e:
        if e.code() == grpc.StatusCode.ALREADY_EXISTS:
            # List tenants and find ExploreIOT
            list_resp = tenant_client.List(
                api.ListTenantsRequest(limit=100), metadata=auth
            )
            tenant_id = None
            for t in list_resp.result:
                if t.name == "ExploreIOT":
                    tenant_id = t.id
                    break
            if not tenant_id:
                logger.error("Tenant 'ExploreIOT' not found after creation conflict")
                sys.exit(1)
            logger.info("Tenant already exists: %s", tenant_id)
        else:
            raise

    # --- Device Profile ---
    dp_client = api.DeviceProfileServiceStub(channel)
    try:
        dp_req = api.CreateDeviceProfileRequest(
            device_profile=api.DeviceProfile(
                name="SHT31-LoRa",
                tenant_id=tenant_id,
                region=api.common.Region.Value("EU868"),
                mac_version=api.common.MacVersion.Value("LORAWAN_1_0_3"),
                reg_params_revision=api.common.RegParamsRevision.Value("A"),
                supports_otaa=True,
                uplink_interval=300,
            )
        )
        dp_resp = dp_client.Create(dp_req, metadata=auth)
        dp_id = dp_resp.id
        logger.info("Device profile created: %s", dp_id)
    except grpc.RpcError as e:
        if e.code() == grpc.StatusCode.ALREADY_EXISTS:
            list_resp = dp_client.List(
                api.ListDeviceProfilesRequest(limit=100, tenant_id=tenant_id),
                metadata=auth,
            )
            dp_id = None
            for dp in list_resp.result:
                if dp.name == "SHT31-LoRa":
                    dp_id = dp.id
                    break
            if not dp_id:
                logger.error("Device profile 'SHT31-LoRa' not found")
                sys.exit(1)
            logger.info("Device profile already exists: %s", dp_id)
        else:
            raise

    # --- Application ---
    app_client = api.ApplicationServiceStub(channel)
    try:
        app_req = api.CreateApplicationRequest(
            application=api.Application(
                name="exploreiot-demo",
                tenant_id=tenant_id,
                description="ExploreIOT Demo Application",
            )
        )
        app_resp = app_client.Create(app_req, metadata=auth)
        app_id = app_resp.id
        logger.info("Application created: %s", app_id)
    except grpc.RpcError as e:
        if e.code() == grpc.StatusCode.ALREADY_EXISTS:
            list_resp = app_client.List(
                api.ListApplicationsRequest(limit=100, tenant_id=tenant_id),
                metadata=auth,
            )
            app_id = None
            for a in list_resp.result:
                if a.name == "exploreiot-demo":
                    app_id = a.id
                    break
            if not app_id:
                logger.error("Application 'exploreiot-demo' not found")
                sys.exit(1)
            logger.info("Application already exists: %s", app_id)
        else:
            raise

    # --- Devices ---
    device_client = api.DeviceServiceStub(channel)
    for dev in DEVICES:
        try:
            dev_req = api.CreateDeviceRequest(
                device=api.Device(
                    dev_eui=dev["dev_eui"],
                    name=dev["name"],
                    application_id=app_id,
                    device_profile_id=dp_id,
                    is_disabled=False,
                )
            )
            device_client.Create(dev_req, metadata=auth)
            logger.info("Device created: %s (%s)", dev["name"], dev["dev_eui"])
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.ALREADY_EXISTS:
                logger.info("Device already exists: %s (%s)", dev["name"], dev["dev_eui"])
            else:
                raise

    logger.info("Provisioning complete! %d devices ready.", len(DEVICES))
    channel.close()


if __name__ == "__main__":
    provision()
