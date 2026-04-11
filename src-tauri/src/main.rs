#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

fn main() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_core_tables",
            sql: include_str!("../migrations/0001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_demo_data",
            sql: include_str!("../migrations/0002_seed_demo.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "sync_license_audit",
            sql: include_str!("../migrations/0003_sync_license_audit.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "fashion_focus_sector",
            sql: include_str!("../migrations/0004_fashion_focus_sector.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "catalogo_moda_consistente",
            sql: include_str!("../migrations/0005_catalogo_moda_consistente.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "product_image_upload",
            sql: include_str!("../migrations/0006_product_image_upload.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "customer_supplier_status",
            sql: include_str!("../migrations/0007_customer_supplier_status.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "purchase_item_size",
            sql: include_str!("../migrations/0008_purchase_item_size.sql"),
            kind: MigrationKind::Up,
        },
    ];

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:smart-tech-pdv.db", migrations)
                .build(),
        );

    builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .run(tauri::generate_context!())
        .expect("error while running smart tech pdv");
}
