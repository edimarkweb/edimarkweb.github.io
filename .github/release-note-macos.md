
<!-- macos-quarantine -->
### macOS

Al abrir la aplicación, macOS avisa de que «está dañada y debería moverse a la papelera». No lo está: el `.dmg` no está firmado con una cuenta de desarrollador de Apple, y eso es lo que dice el sistema ante cualquier aplicación sin firmar descargada de internet. Arrastra EdiMarkWeb a **Aplicaciones**, abre el **Terminal** y ejecuta una sola vez:

```
xattr -dr com.apple.quarantine /Applications/EdiMarkWeb.app
```

Esa orden solo quita la marca de «descargado de internet» a esa aplicación, sin cambiar ningún ajuste de seguridad del sistema.

*The `.dmg` is not signed with an Apple developer account, so macOS claims the application is damaged. Move EdiMarkWeb to Applications and run the command above once.*
