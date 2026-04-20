package esprit.tn.collab.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class MvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Simple relative mapping: /uploads/media/** maps to local folder uploads/media/
        // file: indicates external filesystem relative to the working directory.
        registry.addResourceHandler("/uploads/media/**")
                .addResourceLocations("file:uploads/media/");
    }
}
